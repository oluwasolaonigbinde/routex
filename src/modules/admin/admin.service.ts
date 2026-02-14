import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { DeviceInfo, LoginDto, ChangePasswordDto } from '../auth/dto/auth.dto';
import { convertTextToSlug } from '@/util/format';
import { AbstractAuthService } from '../auth/auth.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { EnvironmentVariables } from '@/validators/env.validation';
import { SessionService } from '../session/session.service';
import { AdminAccessTokenClaims, Tokens } from '@/types/auth';
import { VerificationTokenService } from '../verification-token/verification-token.service';
import { Admin } from '@prisma/client';
import type { Prisma } from '@prisma/client';
import { CreateBaseUserDto } from '../auth/entities/auth.entity';
import { plainToInstance } from 'class-transformer';
import { AdminPasswordResetRequestedEvent } from './event/admin-password-reset-requested';
import { AdminPasswordChangedEvent } from './event/admin-password-changed';
import { ResetPasswordDto } from '../auth/dto/auth.dto';
import { AdminCreatedEvent } from './event/admin-created';
import { CreateAdminDto } from './dto/dto';
import { UsersService } from '../user/users.service';

@Injectable()
export class AdminService extends AbstractAuthService {
    constructor(
        protected readonly database: DatabaseService,
        protected readonly usersService: UsersService,
        protected jwtService: JwtService,
        protected configService: ConfigService<EnvironmentVariables>,
        protected sessionService: SessionService,
        protected databaseService: DatabaseService,
        protected verificationService: VerificationTokenService,
        protected eventEmitter: EventEmitter2,
    ) {
        super(
            jwtService,
            configService,
            sessionService,
            databaseService,
            verificationService,
        );
    }

    get tenantId(): 'admin' {
        return 'admin';
    }

    async signIn(
        userDto: LoginDto,
        deviceInfo: DeviceInfo,
    ): Promise<
        {
            user: Admin;
        } & Tokens
    > {
        return (await super.signIn(userDto, deviceInfo)) as {
            user: Admin;
        } & Tokens;
    }

    async signUp(
        user: CreateBaseUserDto,
        deviceInfo?: DeviceInfo | null,
        createSession?: boolean,
    ): Promise<
        {
            user: Admin;
            newUser?: boolean;
            emailVerificationToken?: string;
            emailVerificationTokenExpiresAt?: Date;
        } & Tokens
    > {
        const signupAdminData = (await super.signUp(
            user,
            deviceInfo,
            createSession,
        )) as unknown as {
            user: Admin;
            newUser?: boolean;
            emailVerificationToken?: string;
            emailVerificationTokenExpiresAt?: Date;
        } & Tokens;

        this.eventEmitter.emit(
            'admin.created',
            new AdminCreatedEvent(
                signupAdminData.user.id,
                signupAdminData.user.email,
                signupAdminData.user.firstName || signupAdminData.user.username,
            ),
        );

        return signupAdminData;
    }

    async requestPasswordReset(email: string) {
        const admin = await this.findUser({ email });

        this.eventEmitter.emit(
            'admin.password_reset_requested',
            new AdminPasswordResetRequestedEvent(
                admin.id,
                admin.email,
                admin.firstName || admin.username,
            ),
        );
    }

    async changePassword(userId: string, password: ChangePasswordDto) {
        const result = await super.changePassword(userId, password);

        const admin = await this.findUser({ id: userId });

        this.eventEmitter.emit(
            'admin.password_changed',
            new AdminPasswordChangedEvent(
                admin.id,
                admin.email,
                admin.firstName || admin.username,
            ),
        );

        return result;
    }

    async resetPassword(resetPasswordDto: ResetPasswordDto) {
        const result = await super.resetPassword(resetPasswordDto);

        const admin = await this.findUser({ email: resetPasswordDto.email });

        this.eventEmitter.emit(
            'admin.password_changed',
            new AdminPasswordChangedEvent(
                admin.id,
                admin.email,
                admin.firstName || admin.username,
            ),
        );

        return result;
    }

    async findBackupCodeById(
        adminId: string,
        code: string,
    ): Promise<{ id: string }> {
        const backupCode = await this.database.backupCode.findFirst({
            where: {
                adminId,
                code,
                used: false,
            },
        });

        if (!backupCode) {
            throw new NotFoundException(
                'Backup code not found or already used',
            );
        }

        return { id: backupCode.id };
    }

    async createBackupCodes(
        adminId: string,
        backupCodes: string[],
    ): Promise<void> {
        await this.database.backupCode.createMany({
            data: backupCodes.map((code) => ({
                adminId,
                code,
            })),
        });
    }

    async deleteBackupCodes(adminId: string): Promise<void> {
        await this.database.backupCode.deleteMany({
            where: { adminId },
        });
    }

    async useBackupCode(id: string): Promise<void> {
        await this.database.backupCode.update({
            where: { id },
            data: { used: true },
        });
    }

    async findUserWithoutException({
        username,
        email,
        id,
        includeDeleted,
    }: {
        username?: string;
        email?: string;
        id?: string;
        includeDeleted?: boolean;
    }): Promise<Admin | null> {
        if (!username && !email && !id)
            throw new Error('Username or email or id must be given');

        const where: Prisma.AdminWhereInput = {
            OR: [{ username }, { email }, { id }],
        };

        if (!includeDeleted) {
            where.deletedAt = null;
        }

        const admin = await this.database.admin.findFirst({ where });

        return admin;
    }

    updateUser(userId: string, newData: Partial<Admin>): Promise<Admin> {
        return this.database.admin.update({
            where: {
                id: userId,
            },
            data: newData,
        });
    }

    getClaims(user: Admin) {
        return plainToInstance(AdminAccessTokenClaims, user, {
            strategy: 'excludeAll',
        });
    }

    async findUser({
        username,
        email,
        id,
        includeDeleted,
    }: {
        username?: string;
        email?: string;
        id?: string;
        includeDeleted?: boolean;
    }): Promise<Admin> {
        const admin = await this.findUserWithoutException({
            username,
            email,
            id,
            includeDeleted,
        });

        if (!admin) {
            if (username) {
                throw new NotFoundException(
                    `Admin with username "${username}" not found`,
                );
            } else if (email) {
                throw new NotFoundException(
                    `Admin with email "${email}" not found`,
                );
            } else if (id) {
                throw new NotFoundException(`Admin with id "${id}" not found`);
            } else {
                throw new NotFoundException('User not found');
            }
        }

        return admin;
    }

    async create(user: CreateAdminDto) {
        const defaultUserName = convertTextToSlug(user.email.split('@')[0]);

        return await this.database.admin.create({
            data: {
                ...user,
                username: defaultUserName,
                tenant: 'ADMIN',
                role: user.role,
                credentialStatus: 'ACTIVE',
                passwordResetRequired: true,
                require2Fa: false,
                requireEmailVerification: false,
            },
        });
    }
}
