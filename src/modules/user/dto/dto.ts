import {
    ApiProperty,
    PickType,
    PartialType,
    IntersectionType,
} from '@nestjs/swagger';
import { Prisma, CredentialStatus } from '@prisma/client';
import { IsEnum, IsOptional } from 'class-validator';
import { HasMimeType, IsFile, MaxFileSize, StoredFile } from 'nestjs-form-data';
import { PaginatedQuery } from '@/util/dto';
import { DeviceInfoDto } from '@/modules/auth/dto/auth.dto';
import { EmergencyContact, User } from '@/modules/user/entities/user.entity';

export class CreateUserDto
    extends IntersectionType(
        PickType(User, ['email', 'password', 'phone', 'referralCode'] as const),
        DeviceInfoDto,
    )
    implements Omit<Prisma.UserCreateInput, 'username' | 'tenant'> {}

export class UpdateProfileDto extends PartialType(
    PickType(User, [
        'firstName',
        'lastName',
        'phone',
        'middleName',
        'title',
        'dateOfBirth',
        'city',
    ] as const),
) {
    @IsOptional()
    @ApiProperty({ type: 'string', format: 'binary', required: false })
    @IsFile()
    @MaxFileSize(1e6)
    @HasMimeType(['image/jpeg', 'image/png'])
    displayPhoto?: StoredFile;
}

export class GetAllUsersDto extends PaginatedQuery {
    @IsOptional()
    @IsEnum(CredentialStatus)
    @ApiProperty({
        required: false,
        enum: CredentialStatus,
        description: 'Filter users by credential status',
    })
    credentialStatus?: CredentialStatus;
}

export class CreateEmergencyContactDto extends PickType(EmergencyContact, [
    'firstName',
    'lastName',
    'phone',
    'relationship',
] as const) {}

export class UpdateEmergencyContactDto extends PartialType(
    CreateEmergencyContactDto,
) {}
