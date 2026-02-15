import { Injectable, NotFoundException } from '@nestjs/common';
import { convertTextToSlug } from '@/util/format';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { EnvironmentVariables } from '@/validators/env.validation';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Tokens, UserAccessTokenClaims } from '@/types/auth';
import type { Driver, Prisma } from '@prisma/client';
import { plainToInstance } from 'class-transformer';
import { StorageService } from '@/storage/storage.service';
import {
    UserWithEmailNotFoundException,
    UserWithIdNotFoundException,
    UserWithUsernameNotFoundException,
} from '@/common/exception/exception';
import { AbstractAuthService } from '@/modules/auth/auth.service';
import { DatabaseService } from '@/modules/database/database.service';
import { SessionService } from '@/modules/session/session.service';
import { VerificationTokenService } from '@/modules/verification-token/verification-token.service';
import {
    ChangePasswordDto,
    DeviceInfo,
    LoginDto,
    ResetPasswordDto,
} from '@/modules/auth/dto/auth.dto';
import {
    CreateDriverDto,
    GetAllDriversDto,
} from '@/modules/driver/dto/driver.dto';
import { UpdateProfileDto } from '@/modules/user/dto/dto';
import { DriverCreatedEvent } from '@/modules/driver/events/driver-created.event';
import { UserPasswordResetRequestedEvent } from '@/modules/user/events/user-password-reset-requested.event';
import { UserPasswordChangedEvent } from '@/modules/user/events/user-password-changed.event';
import { DRIVER_EVENTS } from '@/modules/driver/types/events';

@Injectable()
export class DriverService extends AbstractAuthService {
    constructor(
        protected readonly db: DatabaseService,
        protected jwtService: JwtService,
        protected configService: ConfigService<EnvironmentVariables>,
        protected sessionService: SessionService,
        protected databaseService: DatabaseService,
        protected storageService: StorageService,
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

    get tenantId(): 'driver' {
        return 'driver';
    }

    async signIn(
        userDto: LoginDto,
        deviceInfo: DeviceInfo,
    ): Promise<
        {
            user: Driver;
        } & Tokens
    > {
        return (await super.signIn(userDto, deviceInfo)) as unknown as Promise<
            {
                user: Driver;
            } & Tokens
        >;
    }

    async findBackupCodeById(
        userId: string,
        code: string,
    ): Promise<{ id: string }> {
        const backupCode = await this.db.backupCode.findFirst({
            where: {
                userId,
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
        userId: string,
        backupCodes: string[],
    ): Promise<void> {
        await this.db.backupCode.createMany({
            data: backupCodes.map((code) => ({
                userId,
                code,
            })),
        });
    }

    async deleteBackupCodes(userId: string): Promise<void> {
        await this.db.backupCode.deleteMany({
            where: { userId },
        });
    }

    async useBackupCode(id: string): Promise<void> {
        await this.db.backupCode.update({
            where: { id },
            data: { used: true },
        });
    }

    async create(user: CreateDriverDto) {
        const defaultUserName = convertTextToSlug(user.email.split('@')[0]);

        return await this.db.user.create({
            data: {
                ...user,
                username: defaultUserName,
                tenant: 'DRIVER',
            },
        });
    }

    async getAllUsers(filters: GetAllDriversDto) {
        const { page, limit } = filters;
        const skip = (page - 1) * limit;

        const where: Prisma.DriverWhereInput = {};

        const [users, totalCount] = await Promise.all([
            this.db.driver.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
            }),
            this.db.driver.count({ where }),
        ]);

        return {
            totalCount,
            page,
            limit,
            results: users,
        };
    }

    async updateUser(id: string, newData: Partial<Driver>) {
        return this.db.driver.update({
            where: {
                id,
            },
            data: newData,
        });
    }

    getClaims(user: Driver) {
        return plainToInstance(UserAccessTokenClaims, user, {
            strategy: 'excludeAll',
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
    }) {
        if (!username && !email && !id)
            throw new Error('Username or email or id must be given');

        const where: Prisma.DriverWhereInput = {
            OR: [{ username }, { email }, { id }],
        };

        if (!includeDeleted) {
            where.deletedAt = null;
        }

        const user = await this.db.driver.findFirst({ where });

        return user;
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
    }): Promise<Driver> {
        const user = await this.findUserWithoutException({
            username,
            email,
            id,
            includeDeleted,
        });

        if (!user) {
            if (username) {
                throw new UserWithUsernameNotFoundException(username);
            } else if (email) {
                throw new UserWithEmailNotFoundException(email);
            } else if (id) {
                throw new UserWithIdNotFoundException(id);
            } else {
                throw new NotFoundException('User not found');
            }
        }

        return user as unknown as Driver;
    }

    async updateProfile(userId: string, profileDto: UpdateProfileDto) {
        const {
            // displayPhoto,

            ...profile
        } = profileDto;
        // const user = await this.findUser({
        //     id: userId,
        // });

        // let displayPhotoKey = user.displayPhotoKey;

        // if (displayPhoto) {
        //     const newDisplayPhotoKey = `users/${userId}/display-photo`;

        //     const { key } = await this.storageService.uploadFile({
        //         file: displayPhoto,
        //         key: newDisplayPhotoKey,
        //         private: false,
        //     });

        //     displayPhotoKey = key;
        // }

        return await this.db.driver.update({
            where: { id: userId },
            data: {
                ...profile,
                // ...(displayPhotoKey && { displayPhotoKey }),
            },
        });
    }

    async signUp(
        user: Omit<CreateDriverDto, 'deviceInfo' | 'deviceId'>,
        deviceInfo: DeviceInfo,
    ) {
        const signupUserData = (await super.signUp(
            user,
            deviceInfo,
        )) as unknown as {
            user: Driver;
            newUser?: boolean;
        } & Tokens;

        this.eventEmitter.emit(
            DRIVER_EVENTS.CREATED,
            new DriverCreatedEvent(
                signupUserData.user.id,
                signupUserData.user.email,
                signupUserData.user.username,
            ),
        );

        return signupUserData as unknown as Promise<
            {
                user: Driver;
                newUser?: boolean;
            } & Tokens
        >;
    }

    async requestPasswordReset(email: string) {
        const user = await this.findUser({ email });

        this.eventEmitter.emit(
            DRIVER_EVENTS.PASSWORD_RESET_REQUESTED,
            new UserPasswordResetRequestedEvent(
                user.id,
                user.email,
                user.username,
            ),
        );
    }

    async changePassword(userId: string, password: ChangePasswordDto) {
        const result = await super.changePassword(userId, password);

        const user = await this.findUser({ id: userId });

        this.eventEmitter.emit(
            DRIVER_EVENTS.PASSWORD_CHANGED,
            new UserPasswordChangedEvent(
                user.id,
                user.email,
                user.firstName || user.username,
            ),
        );

        return result;
    }

    async resetPassword(resetPasswordDto: ResetPasswordDto) {
        const result = await super.resetPassword(resetPasswordDto);

        const user = await this.findUser({ email: resetPasswordDto.email });

        this.eventEmitter.emit(
            DRIVER_EVENTS.PASSWORD_CHANGED,
            new UserPasswordChangedEvent(
                user.id,
                user.email,
                user.username ?? user.firstName,
            ),
        );

        return result;
    }
}
