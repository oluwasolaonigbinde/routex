import { BaseUserEntity } from '@/modules/auth/entities/auth.entity';
import { ExposeAll } from '@/util/decorator';
import { ApiProperty, PickType } from '@nestjs/swagger';
import { Admin as PrismaAdmin, Role } from '@prisma/client';
import { IsEnum } from 'class-validator';

export class Admin extends BaseUserEntity implements PrismaAdmin {
    @IsEnum(Role)
    @ApiProperty({
        description: 'The role of the user or admin',
        example: 'admin',
    })
    role: Role;
}

@ExposeAll()
export class AdminEntity extends PickType(Admin, [
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
    'role',
] as const) {}
