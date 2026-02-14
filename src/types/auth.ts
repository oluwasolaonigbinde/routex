import { ApiResponse } from '.';
import { IntersectionType, PickType } from '@nestjs/swagger';
import { ExposeAll } from '@/util/decorator';
import { BaseUserEntity } from '@/modules/auth/entities/auth.entity';
import { Admin } from '@/modules/admin/entities/admin.entity';

export type JwtToken = {
    sub: string;
    exp: number;
    iat: number;
    scope?: string[];
};

@ExposeAll()
export class BaseUserAccessTokenClaims extends PickType(BaseUserEntity, [
    'email',
    'firstName',
    'lastName',
    'username',
    'tenant',
    'emailVerifiedAt',
] as const) {}

export class UserAccessTokenClaims extends BaseUserAccessTokenClaims {}

@ExposeAll()
export class AdminAccessTokenClaims extends IntersectionType(
    BaseUserAccessTokenClaims,
    PickType(Admin, ['role'] as const),
) {}

export interface AccessTokenDTO extends JwtToken, BaseUserAccessTokenClaims {
    sid?: string;
}
export interface AdminAccessTokenDTO extends JwtToken, AdminAccessTokenClaims {}

export interface RefreshTokenDto extends JwtToken {
    jti: string;
}

export type Tokens = {
    access_token?: string;
    refresh_token?: string;
};

export type UserTokenResponse = {
    user: BaseUserEntity;
    newUser?: boolean;
    emailVerificationToken?: string;
    emailVerificationTokenExpiresAt?: Date;
} & Tokens;

export type UserSessionTokenResponse = UserTokenResponse & ApiResponse;

export interface RefreshToken extends RefreshTokenDto {
    token: string;
}
