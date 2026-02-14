import { BaseUserEntity } from '@/modules/auth/entities/auth.entity';
import { ApiResponse } from '@/types';
import { ExposeAll } from '@/util/decorator';
import { ApiProperty, PickType } from '@nestjs/swagger';
import { Admin as PrismaAdmin, Role } from '@prisma/client';
import { Type } from 'class-transformer';
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

type LoginAdminResponseDataType = {
    user: AdminEntity;
    access_token?: string;
    refresh_token?: string;
};

@ExposeAll()
export class LoginAdminResponseData implements LoginAdminResponseDataType {
    @ApiProperty({ type: AdminEntity })
    @Type(() => AdminEntity)
    user: AdminEntity;

    @ApiProperty({ type: String })
    access_token?: string;

    @ApiProperty({ type: String })
    refresh_token?: string;
}

@ExposeAll()
export class LoginAdminResponse implements ApiResponse<LoginAdminResponseData> {
    @ApiProperty({ type: String })
    message: string;

    @ApiProperty({ type: String })
    status: 'pending' | 'success' | 'failed' | 'processing';

    @ApiProperty({ type: LoginAdminResponseData })
    @Type(() => LoginAdminResponseData)
    data: LoginAdminResponseData;
}

@ExposeAll()
export class AdminEntityApiResponse implements ApiResponse<AdminEntity> {
    @ApiProperty({ type: String })
    status: 'pending' | 'success' | 'failed';

    @ApiProperty({ type: String })
    message: string;

    @ApiProperty({ type: AdminEntity })
    @Type(() => AdminEntity)
    data?: AdminEntity;
}

@ExposeAll()
export class AdminListData {
    @ApiProperty({ type: [AdminEntity] })
    @Type(() => AdminEntity)
    admins: AdminEntity[];

    @ApiProperty({ type: Number })
    totalCount: number;

    @ApiProperty({ type: Number })
    page: number;

    @ApiProperty({ type: Number })
    limit: number;
}

@ExposeAll()
export class AdminListResponse implements ApiResponse<AdminListData> {
    @ApiProperty({ type: String })
    status: 'pending' | 'success' | 'failed';

    @ApiProperty({ type: String })
    message: string;

    @ApiProperty({ type: AdminListData })
    @Type(() => AdminListData)
    data: AdminListData;
}
