import { Role } from '@prisma/client';
import { BaseUserEntity } from '../entities/auth.entity';
import { Expose } from 'class-transformer';
import {
    ApiPropertyOptional,
    PickType,
    IntersectionType,
} from '@nestjs/swagger';
import {
    IsEmail,
    IsEnum,
    IsNotEmpty,
    IsOptional,
    IsString,
    IsStrongPassword,
    IsUUID,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { IsPassword } from '../validators';

export class DeviceInfoDto {
    @IsUUID('4')
    @IsNotEmpty()
    @ApiProperty({
        description: 'A unique identifier for the device.',
    })
    deviceId: string;

    @IsString()
    @IsOptional()
    @ApiPropertyOptional({
        description: 'The name of the device.',
        example: "John's iPhone",
    })
    deviceName?: string;
}

export class DeviceInfo extends DeviceInfoDto {
    ipAddress?: string;
    userAgent?: string;
    lastSeenAt?: Date | null;
}

export class LoginDto extends IntersectionType(
    PickType(BaseUserEntity, ['email', 'password'] as const),
    DeviceInfoDto,
) {}

export class ChangePasswordDto {
    @IsNotEmpty()
    @ApiProperty({
        description: 'The old password of the user',
        example: 'oldPassword',
    })
    oldPassword: string;

    @IsStrongPassword()
    @ApiProperty({
        description: 'The new password of the user',
        example: 'newPassword',
    })
    newPassword: string;
}

export class ForgotPasswordDto extends PickType(BaseUserEntity, [
    'email',
] as const) {
    @Expose()
    @ApiProperty()
    email: string;
}

export class VerifyEmailDto {
    @IsString()
    @IsNotEmpty()
    @ApiProperty()
    token: string;

    @IsEmail()
    @IsNotEmpty()
    @ApiProperty()
    email: string;
}


export class ResetPasswordDto {
    @IsNotEmpty()
    @IsEmail()
    @ApiProperty()
    email: string;

    @IsNotEmpty()
    @IsString()
    @ApiProperty({
        description: 'The password reset token',
        example: 'token',
    })
    token: string;

    @IsNotEmpty()
    @IsPassword()
    newPassword: string;
}

export class ChangeRoleDto {
    @IsEnum(Role)
    @ApiProperty({
        description: 'The new role for the user or admin',
        example: 'admin',
    })
    role: Role;
}

export class RoleQuery {
    @IsEnum(Role)
    @ApiProperty({
        description: 'The role to filter users or admins',
        example: 'admin',
    })
    role: Role;
}

export class Verify2faDto extends DeviceInfoDto {
    @ApiProperty({
        description: 'The 2FA token to verify',
        example: '123456',
    })
    @IsNotEmpty()
    @IsString()
    token: string;
}

export class VerifyBackupCodeDto extends DeviceInfoDto {
    @ApiProperty({
        description: 'The backup code to verify',
        example: 'backup-code-123',
    })
    @IsNotEmpty()
    @IsString()
    code: string;
}
