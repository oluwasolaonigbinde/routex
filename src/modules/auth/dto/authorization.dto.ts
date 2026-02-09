import { ApiProperty } from '@nestjs/swagger';
import { AuthorizationMethod } from '@prisma/client';
import { IsEnum, IsString, Length } from 'class-validator';
import { IsPassword } from '../validators';

export interface AuthorizationDtoProps {
    method: AuthorizationMethod;
    credential: unknown;
}
export class AuthorizationDto implements AuthorizationDtoProps {
    @ApiProperty({ enum: AuthorizationMethod })
    @IsEnum(AuthorizationMethod)
    method: AuthorizationMethod;

    credential: unknown;
}

export class PasswordAuthorizationDto extends AuthorizationDto {
    @ApiProperty({ format: 'password' })
    @IsPassword()
    password: string;
}

export class OtpAuthorizationDto extends AuthorizationDto {
    @ApiProperty({ example: '493021' })
    @IsString()
    @Length(6, 6)
    code: string;
}
