import {
    IsBoolean,
    IsDate,
    IsEmail,
    IsEnum,
    IsNotEmpty,
    IsNumber,
    IsOptional,
    IsPhoneNumber,
    IsString,
    IsUUID,
    Length,
    Matches,
} from 'class-validator';
import {
    User,
    Admin,
    Tenant,
    Prisma,
    CredentialStatus,
    Session as PrismaSession,
    $Enums,
} from '@prisma/client';
import {
    Intent as PrismaIntent,
    IntentStatus,
    IntentType,
} from '@prisma/client';
import { ApiProperty, ApiPropertyOptional, PickType } from '@nestjs/swagger';
import { ExposeAll } from '@/util/decorator';
import { Type } from 'class-transformer';
import { IsPassword } from '../validators';
import { CommonProps } from '@/types/common';
import { ApiResponse, PaginatedResponse } from '@/types';

type Simplify<T> = {
    [K in keyof T]: T[K];
};

type RequiredOnly<T> = Simplify<{
    [K in keyof T as null extends T[K]
        ? never
        : undefined extends T[K]
          ? never
          : K]: T[K];
}>;

export class BaseUserEntity implements RequiredOnly<CommonProps<User, Admin>> {
    @IsUUID()
    @ApiProperty()
    id: string;

    @IsNotEmpty()
    @Length(2, 50)
    @ApiProperty({
        description: 'First name of the user',
        example: 'John',
    })
    firstName: string | null;

    @IsNotEmpty()
    @Length(2, 50)
    @ApiProperty({
        description: 'Last name of the user',
        example: 'Doe',
    })
    lastName: string | null;

    @IsEmail()
    @IsNotEmpty()
    @ApiProperty({
        description: 'The email of the user',
        example: 'user@example.com',
    })
    email: string;

    @IsDate()
    @ApiPropertyOptional({ type: Date })
    emailVerifiedAt: Date | null;

    @ApiProperty({
        description: 'Require email verification for this account',
        type: Boolean,
        default: false,
    })
    @IsBoolean()
    requireEmailVerification: boolean;

    @ApiProperty({
        description: 'Require two-factor authentication for this account',
        type: Boolean,
        default: false,
    })
    @IsBoolean()
    require2Fa: boolean;

    @ApiProperty({
        description: 'Require password reset on next login',
        type: Boolean,
        default: false,
    })
    @IsBoolean()
    passwordResetRequired: boolean;

    @IsEnum(Tenant)
    @ApiProperty()
    tenant: Tenant;

    @IsNotEmpty()
    @Length(2, 30)
    @Matches(/^[a-z0-9]+(-[a-z0-9]+)*$/, {
        message:
            'Username must contain lowercase letters, numbers, and hyphens only.',
    })
    @ApiProperty({
        description: 'The name of the user',
        example: 'john',
    })
    username: string;

    @IsOptional()
    @IsPhoneNumber('NG', {
        message: 'Phone number must be a valid Nigerian phone number',
    })
    @ApiProperty({
        description: 'Phone number of the user',
        example: '+2348012345678',
        required: false,
        type: String,
    })
    phone: string | null;

    @IsPassword()
    @ApiProperty({
        description: 'The password of the user',
    })
    password: string;

    @IsDate()
    @ApiProperty({
        description: 'date the user was created',
        example: '2023-01-01T00:00:00.000Z',
    })
    createdAt: Date;

    @IsDate()
    @IsNotEmpty()
    @ApiProperty({
        description: 'date the user was updated',
        example: '2023-01-01T00:00:00.000Z',
    })
    updatedAt: Date;

    @ApiProperty({
        enum: CredentialStatus,
    })
    @IsEnum(CredentialStatus)
    credentialStatus: CredentialStatus;

    @ApiPropertyOptional({
        description: 'The two-factor authentication secret for the user',
        type: String,
    })
    twoFactorSecret: string | null;

    @ApiPropertyOptional({
        description: 'The two-factor authentication method for the user',
        example: 'totp',
        type: String,
    })
    twoFactorMethod: string | null;

    @ApiPropertyOptional({
        description:
            'Indicates if two-factor authentication is enabled for the user',
        type: Boolean,
    })
    twoFactorEnabled: boolean;

    @ApiPropertyOptional({
        type: Date,
    })
    @IsDate()
    suspendedAt: Date | null;

    @ApiPropertyOptional({
        type: Date,
    })
    @IsDate()
    lockedAt: Date | null;

    @ApiPropertyOptional({
        type: Date,
    })
    @IsDate()
    deletedAt: Date | null;

    @ApiPropertyOptional({
        type: Date,
    })
    @IsDate()
    blockedAt: Date | null;

    @ApiPropertyOptional({
        type: Date,
    })
    @IsDate()
    lockExpiresAt: Date | null;

    constructor(partial: Partial<BaseUserEntity>) {
        Object.assign(this, partial);
    }
}

export type CreateBaseUserDto = CommonProps<
    RequiredOnly<Omit<Prisma.AdminCreateInput, 'username' | 'tenant'>>,
    RequiredOnly<Omit<Prisma.UserCreateInput, 'username' | 'tenant'>>
>;

@ExposeAll()
export class BackupCodesResponse implements ApiResponse<{ codes: string[] }> {
    @ApiProperty({ type: String })
    status: 'pending' | 'success' | 'failed';

    @ApiProperty({ type: String })
    message: string;

    @ApiProperty({ type: [String] })
    data: { codes: string[] };
}

export class Session implements PrismaSession {
    @IsUUID()
    @ApiProperty()
    id: string;

    @IsUUID()
    @ApiProperty()
    deviceId: string;

    @IsUUID()
    @ApiProperty()
    userId: string;

    @IsString()
    @IsOptional()
    @ApiPropertyOptional()
    deviceName: string | null;

    @IsString()
    @IsOptional()
    @ApiPropertyOptional()
    ipAddress: string | null;

    @IsString()
    @IsOptional()
    @ApiPropertyOptional()
    userAgent: string | null;

    @IsDate()
    @ApiProperty()
    lastSeenAt: Date;

    @IsDate()
    @ApiProperty({ type: Date })
    createdAt: Date;

    @IsDate()
    @ApiProperty({ type: Date })
    expiresAt: Date;

    @IsString()
    @ApiProperty()
    tokenHash: string;

    @IsDate()
    @ApiProperty({ type: Date })
    updatedAt: Date;
}

@ExposeAll()
export class SessionEntity extends PickType(Session, [
    'deviceId',
    'userId',
    'deviceName',
    'ipAddress',
    'userAgent',
    'expiresAt',
]) {
    @ApiProperty()
    @IsDate()
    firstSeen: Date;

    @ApiProperty()
    @IsDate()
    lastSeen: Date;

    @ApiProperty()
    @IsNumber()
    activeSessions: number;

    @ApiProperty()
    @IsBoolean()
    isCurrentDevice: boolean;
}

export class Intent implements PrismaIntent {
    @IsUUID()
    @ApiProperty({
        type: String,
        description: 'Intent ID to use in authorization request',
    })
    id: string;

    @IsUUID()
    @ApiProperty({
        type: String,
    })
    userId: string;

    @IsEnum(IntentType)
    @ApiProperty({
        enum: IntentType,
    })
    type: IntentType;

    @IsEnum(IntentStatus)
    @ApiProperty({ enum: IntentStatus })
    status: IntentStatus;

    @ApiProperty({ type: Object })
    payload: object;

    @ApiProperty({ type: Object })
    meta: object;

    @ApiProperty({ enum: $Enums.AuthorizationMethod, isArray: true })
    requiredAuthMethods: $Enums.AuthorizationMethod[];

    @IsNumber()
    @ApiProperty({
        type: Number,
        description: 'Minimum number of methods that must succeed',
    })
    minAuthSatisfied: number;

    @IsDate()
    @ApiProperty({ type: Date })
    createdAt: Date;

    @IsDate()
    @ApiProperty({ type: Date })
    expiresAt: Date;

    @IsDate()
    @ApiProperty({ type: Date })
    authorizedAt: Date | null;

    @IsDate()
    @ApiProperty({ type: Date })
    executedAt: Date | null;

    @IsDate()
    @ApiProperty({ type: Date })
    failedAt: Date | null;

    @IsDate()
    @ApiProperty({ type: Date })
    updatedAt: Date;
}

@ExposeAll()
export class IntentEntity extends PickType(Intent, [
    'id',
    'type',
    'requiredAuthMethods',
    'status',
    'minAuthSatisfied',
    'expiresAt',
    'userId',
] as const) {}

type SessionPaginatedResponse = PaginatedResponse<SessionEntity>['data'];

@ExposeAll()
class SessionListResult implements SessionPaginatedResponse {
    @ApiProperty({ description: 'Number of items per page', example: 10 })
    limit: number;

    @ApiProperty({ description: 'Current page number', example: 1 })
    page: number;

    @ApiProperty({ description: 'Total number of sessions', example: 100 })
    totalCount: number;

    @ApiProperty({ type: [SessionEntity], description: 'List of sessions' })
    @Type(() => SessionEntity)
    results: SessionEntity[];
}

@ExposeAll()
export class SessionListResponse implements PaginatedResponse<SessionEntity> {
    @ApiProperty({ type: String })
    status: 'pending' | 'success' | 'failed';

    @ApiProperty({ type: String })
    message: string;

    @ApiProperty({ type: SessionListResult })
    @Type(() => SessionListResult)
    data: SessionListResult;
}
