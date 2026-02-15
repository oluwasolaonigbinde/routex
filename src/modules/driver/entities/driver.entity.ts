import { BaseUserEntity } from '@/modules/auth/entities/auth.entity';
import { BaseUserAccessTokenClaims, JwtToken } from '@/types/auth';
import { ExposeAll } from '@/util/decorator';
import { PickType } from '@nestjs/swagger';
import { Driver as PrismaDriver } from '@prisma/client';

export class Driver extends BaseUserEntity implements PrismaDriver {}

@ExposeAll()
export class DriverEntity extends PickType(Driver, [
    'id',
    'email',
    'emailVerifiedAt',
    'username',
    'firstName',
    'lastName',
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
] as const) {}

@ExposeAll()
export class DriverEmbedEntity extends PickType(Driver, [
    'id',
    'email',
    'firstName',
    'lastName',
] as const) {}

export class DriverAccessTokenClaims extends BaseUserAccessTokenClaims {}

export interface DriverAccessTokenDTO
    extends JwtToken, DriverAccessTokenClaims {}
