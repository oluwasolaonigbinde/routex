import { Injectable, NotFoundException } from '@nestjs/common';
import { convertTextToSlug } from '@/util/format';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { EnvironmentVariables } from '@/validators/env.validation';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Tokens, UserAccessTokenClaims } from '@/types/auth';
import type { EmergencyContact, Prisma, User } from '@prisma/client';
import { plainToInstance } from 'class-transformer';
import { StorageService } from '@/storage/storage.service';
import {
    UserWithEmailNotFoundException,
    UserWithIdNotFoundException,
    UserWithUsernameNotFoundException,
} from '@/common/exception/exception';
import { PaginatedResponse } from '@/types';
import { PaginatedQuery } from '@/util/dto';
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
    CreateEmergencyContactDto,
    CreateUserDto,
    GetAllUsersDto,
    UpdateEmergencyContactDto,
    UpdateProfileDto,
} from '@/modules/user/dto/dto';
import { UserCreatedEvent } from '@/modules/user/events/user-created.event';
import { UserPasswordResetRequestedEvent } from '@/modules/user/events/user-password-reset-requested.event';
import { UserPasswordChangedEvent } from '@/modules/user/events/user-password-changed.event';
import { EmergencyContactNotFoundException } from '@/modules/user/exceptions/exception';

@Injectable()
export class UsersService extends AbstractAuthService {
    constructor(
        protected readonly database: DatabaseService,
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

    get tenantId(): 'user' {
        return 'user';
    }

    async signIn(
        userDto: LoginDto,
        deviceInfo: DeviceInfo,
    ): Promise<
        {
            user: User;
        } & Tokens
    > {
        return (await super.signIn(userDto, deviceInfo)) as unknown as Promise<
            {
                user: User;
            } & Tokens
        >;
    }

    async findBackupCodeById(
        userId: string,
        code: string,
    ): Promise<{ id: string }> {
        const backupCode = await this.database.backupCode.findFirst({
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
        await this.database.backupCode.createMany({
            data: backupCodes.map((code) => ({
                userId,
                code,
            })),
        });
    }

    async deleteBackupCodes(userId: string): Promise<void> {
        await this.database.backupCode.deleteMany({
            where: { userId },
        });
    }

    async useBackupCode(id: string): Promise<void> {
        await this.database.backupCode.update({
            where: { id },
            data: { used: true },
        });
    }

    async create(user: CreateUserDto) {
        const defaultUserName = convertTextToSlug(user.email.split('@')[0]);

        return await this.database.user.create({
            data: {
                ...user,
                username: defaultUserName,
                tenant: 'USER',
            },
        });
    }

    async getAllUsers(filters: GetAllUsersDto) {
        const { page, limit } = filters;
        const skip = (page - 1) * limit;

        const where: Prisma.UserWhereInput = {};

        if (filters.credentialStatus) {
            where.credentialStatus = filters.credentialStatus;
        }

        const [users, totalCount] = await Promise.all([
            this.database.user.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
            }),
            this.database.user.count({ where }),
        ]);

        return {
            totalCount,
            page,
            limit,
            results: users,
        };
    }

    async updateUser(userId: string, newData: Partial<User>) {
        return this.database.user.update({
            where: {
                id: userId,
            },
            data: newData,
        });
    }

    getClaims(user: User) {
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

        const where: Prisma.UserWhereInput = {
            OR: [{ username }, { email }, { id }],
        };

        if (!includeDeleted) {
            where.deletedAt = null;
        }

        const user = await this.database.user.findFirst({ where });

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
    }): Promise<User> {
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

        user['hasPin'] = !!user.pin;

        return user as unknown as User;
    }

    async updateProfile(userId: string, profileDto: UpdateProfileDto) {
        const { displayPhoto, ...profile } = profileDto;
        const user = await this.findUser({
            id: userId,
        });

        let displayPhotoKey = user.displayPhotoKey;

        if (displayPhoto) {
            const newDisplayPhotoKey = `users/${userId}/display-photo`;

            const { key } = await this.storageService.uploadFile({
                file: displayPhoto,
                key: newDisplayPhotoKey,
                private: false,
            });

            displayPhotoKey = key;
        }

        return await this.database.user.update({
            where: { id: userId },
            data: {
                ...profile,
                ...(displayPhotoKey && { displayPhotoKey }),
            },
        });
    }

    async signUp(
        user: Omit<CreateUserDto, 'deviceInfo' | 'deviceId'>,
        deviceInfo: DeviceInfo,
    ) {
        const signupUserData = (await super.signUp(
            user,
            deviceInfo,
        )) as unknown as {
            user: User;
            newUser?: boolean;
        } & Tokens;

        this.eventEmitter.emit(
            'user.created',
            new UserCreatedEvent(
                signupUserData.user.id,
                signupUserData.user.email,
                signupUserData.user.username,
            ),
        );

        return signupUserData as unknown as Promise<
            {
                user: User;
                newUser?: boolean;
            } & Tokens
        >;
    }

    async requestPasswordReset(email: string) {
        const user = await this.findUser({ email });

        this.eventEmitter.emit(
            'user.password_reset_requested',
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
            'user.password_changed',
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
            'user.password_changed',
            new UserPasswordChangedEvent(
                user.id,
                user.email,
                user.username ?? user.firstName,
            ),
        );

        return result;
    }

    // ========== Emergency Contacts ==========

    async createEmergencyContact(
        userId: string,
        dto: CreateEmergencyContactDto,
    ) {
        return this.database.emergencyContact.create({
            data: { userId, ...dto },
        });
    }

    async getEmergencyContacts(
        userId: string,
        query: PaginatedQuery,
    ): Promise<PaginatedResponse<EmergencyContact>['data']> {
        const { page, limit } = query;
        const skip = (page - 1) * limit;

        const where: Prisma.EmergencyContactWhereInput = {
            userId,
            deletedAt: null,
        };

        const [results, totalCount] = await Promise.all([
            this.database.emergencyContact.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
            }),
            this.database.emergencyContact.count({ where }),
        ]);

        return { totalCount, page, limit, results, perPage: results.length };
    }

    async updateEmergencyContact(
        userId: string,
        id: string,
        dto: UpdateEmergencyContactDto,
    ) {
        await this.findEmergencyContactOrFail(userId, id);

        return this.database.emergencyContact.update({
            where: { id },
            data: dto,
        });
    }

    async removeEmergencyContact(userId: string, id: string) {
        await this.findEmergencyContactOrFail(userId, id);

        await this.database.emergencyContact.update({
            where: { id },
            data: { deletedAt: new Date() },
        });
    }

    private async findEmergencyContactOrFail(userId: string, id: string) {
        const contact = await this.database.emergencyContact.findUnique({
            where: { id, deletedAt: null, userId },
        });

        if (!contact) {
            throw new EmergencyContactNotFoundException(id);
        }

        return contact;
    }
}
