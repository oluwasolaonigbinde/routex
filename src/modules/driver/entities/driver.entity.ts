import { BaseUserEntity } from '@/modules/auth/entities/auth.entity';
import { BaseUserAccessTokenClaims, JwtToken } from '@/types/auth';
import { ApiResponse } from '@/types';
import { ExposeAll } from '@/util/decorator';
import { ApiProperty, PickType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
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
    'phone',
] as const) {}

export class DriverAccessTokenClaims extends BaseUserAccessTokenClaims {}

export interface DriverAccessTokenDTO
    extends JwtToken, DriverAccessTokenClaims {}

@ExposeAll()
export class DriverEmbedEntityApiResponse implements ApiResponse<DriverEmbedEntity> {
    @ApiProperty({
        type: String,
        enum: ['pending', 'success', 'failed', 'processing'],
    })
    status: 'pending' | 'success' | 'failed' | 'processing';

    @ApiProperty({ type: String })
    message: string;

    @ApiProperty({ type: DriverEmbedEntity, required: false, nullable: true })
    @Type(() => DriverEmbedEntity)
    data?: DriverEmbedEntity | null;
}
