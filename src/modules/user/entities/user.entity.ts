// import { MediaField } from '@/decorators/storage';
import { BaseUserEntity } from '@/modules/auth/entities/auth.entity';
import { RouteEntity } from '@/modules/booking/entities/route.entity';
import { ApiResponse } from '@/types';
import { ExposeAll } from '@/util/decorator';
import { PaginatedResponse } from '@/util/dto';
import { ApiProperty, ApiPropertyOptional, PickType } from '@nestjs/swagger';
import { User as PrismaUser } from '@prisma/client';
import { Expose, Type } from 'class-transformer';
import {
    IsDate,
    IsNumber,
    IsOptional,
    IsPhoneNumber,
    IsString,
    IsUUID,
    MaxDate,
} from 'class-validator';

export class User extends BaseUserEntity implements PrismaUser {
    @ApiPropertyOptional({ type: String })
    @IsOptional()
    @IsString()
    title: string | null;

    @ApiPropertyOptional({ type: String })
    @IsOptional()
    @IsString()
    middleName: string | null;

    @ApiPropertyOptional({ type: String })
    @IsOptional()
    @IsString()
    city: string | null;

    @ApiPropertyOptional({ type: String })
    @IsOptional()
    @IsString()
    displayPhotoKey: string | null;

    @ApiPropertyOptional({ type: Date })
    @IsOptional()
    @IsDate()
    @Type(() => Date)
    @MaxDate(() => new Date(), {
        message: 'Date of birth must be a past date',
    })
    dateOfBirth: Date | null;

    @IsOptional()
    @IsString()
    referralCode: string | null;

    @IsOptional()
    @IsString()
    pin: string | null;

    @IsOptional()
    @IsDate()
    @ApiPropertyOptional({ type: Date })
    pinLockedUntil: Date | null;

    @IsNumber()
    @ApiProperty({ type: Number })
    pinFailedAttempts: number;

    @ApiProperty({ type: Boolean })
    hasPin: boolean;
}

@ExposeAll()
export class UserEntity extends PickType(User, [
    'id',
    'email',
    'emailVerifiedAt',
    'username',
    'firstName',
    'lastName',
    'title',
    'middleName',
    'dateOfBirth',
    'createdAt',
    'credentialStatus',
    'blockedAt',
    'suspendedAt',
    'lockExpiresAt',
    'deletedAt',
    'require2Fa',
    'requireEmailVerification',
    'passwordResetRequired',
    'twoFactorEnabled',
    'twoFactorMethod',
    'pinFailedAttempts',
    'pinLockedUntil',
    'hasPin',
] as const) {
    // @ApiPropertyOptional({ type: String })
    // @IsOptional()
    // @IsString()
    // @MediaField({
    //     referenceField: 'displayPhotoKey',
    //     visibility: 'public',
    // })
    // displayPhotoUrl: string | null;
}

@ExposeAll()
export class UserEmbedEntitty extends PickType(UserEntity, [
    'id',
    'username',
    'firstName',
    'lastName',
    'email',
    // 'displayPhotoUrl',
] as const) {}

@ExposeAll()
export class UserPrivateEntity extends PickType(UserEntity, [
    'id',
    'email',
    'emailVerifiedAt',
    'username',
    'firstName',
    'lastName',
    'title',
    'middleName',
    'dateOfBirth',
    'createdAt',
    'hasPin',
    // 'displayPhotoUrl',
] as const) {
    constructor(partial: Partial<UserPrivateEntity>) {
        super(partial);
    }
}

type LoginUserResponsDateType = {
    user: UserPrivateEntity;
    access_token: string;
    refresh_token: string;
};

class LoginUserResponseData implements LoginUserResponsDateType {
    @Expose()
    @ApiProperty({ type: UserPrivateEntity })
    @Type(() => UserPrivateEntity)
    user: UserPrivateEntity;

    @Expose()
    @ApiProperty({ type: String })
    access_token: string;

    @Expose()
    @ApiProperty({ type: String })
    refresh_token: string;
}

@Expose()
export class LoginUserResponse implements ApiResponse<LoginUserResponseData> {
    @ApiProperty({ type: String })
    message: string;

    @ApiProperty({ type: String })
    status: 'pending' | 'success' | 'failed' | 'processing';

    @ApiProperty({ type: LoginUserResponseData })
    @Type(() => LoginUserResponseData)
    data: LoginUserResponseData;
}

@ExposeAll()
export class UserPrivateEntityApiResponse implements ApiResponse<UserPrivateEntity> {
    @ApiProperty({ type: String })
    status: 'pending' | 'success' | 'failed';

    @ApiProperty({ type: String })
    message: string;

    @ApiProperty({ type: UserPrivateEntity })
    @Type(() => UserPrivateEntity)
    data: UserPrivateEntity;
}

type UserPaginatedResponse = PaginatedResponse<UserPrivateEntity>['data'];

@ExposeAll()
class UserListResult implements UserPaginatedResponse {
    @ApiProperty({ type: Number })
    totalCount: number;

    @ApiProperty({ type: Number })
    page: number;

    @ApiProperty({ type: Number })
    limit: number;

    @ApiProperty({ type: [UserPrivateEntity], description: 'List of users' })
    @Type(() => UserPrivateEntity)
    results: UserPrivateEntity[];

    constructor(partial: Partial<UserListResult>) {
        Object.assign(this, partial);
    }
}

@ExposeAll()
export class UsersListApiResponse implements PaginatedResponse<UserPrivateEntity> {
    @ApiProperty({ type: String })
    status: 'pending' | 'success' | 'failed';

    @ApiProperty({ type: String })
    message: string;

    @ApiProperty({ type: UserListResult })
    @Type(() => UserListResult)
    data: UserListResult;

    constructor(partial: Partial<UsersListApiResponse>) {
        Object.assign(this, partial);
    }
}
@ExposeAll()
export class GetUserResponse implements ApiResponse<UserPrivateEntity> {
    @ApiProperty({ type: String })
    status: 'pending' | 'success' | 'failed';

    @ApiProperty({ type: String })
    message: string;

    @ApiProperty({ type: UserPrivateEntity })
    @Type(() => UserPrivateEntity)
    data: UserPrivateEntity;
}

// ========== EmergencyContact ==========

export class EmergencyContact {
    @ApiProperty({ type: String })
    @IsUUID()
    id: string;

    @ApiProperty({ type: String })
    @IsUUID()
    userId: string;

    @ApiProperty({ type: String })
    @IsString()
    firstName: string;

    @ApiProperty({ type: String })
    @IsString()
    lastName: string;

    @ApiProperty({ type: String })
    @IsPhoneNumber()
    phone: string;

    @ApiProperty({ type: String })
    @IsString()
    relationship: string;

    @ApiProperty({ type: Date })
    createdAt: Date;

    @ApiProperty({ type: Date })
    updatedAt: Date;

    @ApiPropertyOptional({ type: Date, nullable: true })
    deletedAt: Date | null;
}

@ExposeAll()
export class EmergencyContactEntity extends PickType(EmergencyContact, [
    'id',
    'userId',
    'firstName',
    'lastName',
    'phone',
    'relationship',
    'createdAt',
] as const) {}

@ExposeAll()
export class EmergencyContactApiResponse implements ApiResponse<EmergencyContactEntity> {
    @ApiProperty({ type: String })
    status: 'pending' | 'success' | 'failed';

    @ApiProperty({ type: String })
    message: string;

    @ApiProperty({ type: EmergencyContactEntity })
    @Type(() => EmergencyContactEntity)
    data: EmergencyContactEntity;
}

type EmergencyContactPaginatedResponse =
    PaginatedResponse<EmergencyContactEntity>['data'];

@ExposeAll()
class EmergencyContactListResult implements EmergencyContactPaginatedResponse {
    @ApiProperty({ type: Number })
    totalCount: number;

    @ApiProperty({ type: Number })
    page: number;

    @ApiProperty({ type: Number })
    limit: number;

    @ApiProperty({ type: Number })
    perPage: number;

    @ApiProperty({ type: [EmergencyContactEntity] })
    @Type(() => EmergencyContactEntity)
    results: EmergencyContactEntity[];
}

@ExposeAll()
export class EmergencyContactListApiResponse implements PaginatedResponse<EmergencyContactEntity> {
    @ApiProperty({ type: String })
    status: 'pending' | 'success' | 'failed';

    @ApiProperty({ type: String })
    message: string;

    @ApiProperty({ type: EmergencyContactListResult })
    @Type(() => EmergencyContactListResult)
    data: EmergencyContactListResult;
}

// ========== FavoriteRoute ==========

export class FavoriteRoute {
    @ApiProperty({ type: String })
    @IsUUID()
    id: string;

    @ApiProperty({ type: String })
    @IsUUID()
    userId: string;

    @ApiProperty({ type: String })
    @IsUUID()
    routeId: string;

    @ApiProperty({ type: Date })
    createdAt: Date;
}

@ExposeAll()
export class FavoriteRouteEntity extends PickType(FavoriteRoute, [
    'id',
    'userId',
    'routeId',
    'createdAt',
] as const) {
    @ApiProperty({ type: RouteEntity, required: false })
    @Type(() => RouteEntity)
    route?: RouteEntity;
}

@ExposeAll()
export class FavoriteRouteApiResponse implements ApiResponse<FavoriteRouteEntity> {
    @ApiProperty({ type: String })
    status: 'pending' | 'success' | 'failed';

    @ApiProperty({ type: String })
    message: string;

    @ApiProperty({ type: FavoriteRouteEntity })
    @Type(() => FavoriteRouteEntity)
    data: FavoriteRouteEntity;
}

type FavoriteRoutePaginatedResponse =
    PaginatedResponse<FavoriteRouteEntity>['data'];

@ExposeAll()
class FavoriteRouteListResult implements FavoriteRoutePaginatedResponse {
    @ApiProperty({ type: Number })
    totalCount: number;

    @ApiProperty({ type: Number })
    page: number;

    @ApiProperty({ type: Number })
    limit: number;

    @ApiProperty({ type: Number })
    perPage: number;

    @ApiProperty({ type: [FavoriteRouteEntity] })
    @Type(() => FavoriteRouteEntity)
    results: FavoriteRouteEntity[];
}

@ExposeAll()
export class FavoriteRouteListApiResponse implements PaginatedResponse<FavoriteRouteEntity> {
    @ApiProperty({ type: String })
    status: 'pending' | 'success' | 'failed';

    @ApiProperty({ type: String })
    message: string;

    @ApiProperty({ type: FavoriteRouteListResult })
    @Type(() => FavoriteRouteListResult)
    data: FavoriteRouteListResult;
}
