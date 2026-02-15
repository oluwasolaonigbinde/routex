import { DeviceInfoDto } from '@/modules/auth/dto/auth.dto';
import { Driver } from '@/modules/driver/entities/driver.entity';
import { PaginatedQuery } from '@/util/dto';
import { IntersectionType, PartialType, PickType } from '@nestjs/swagger';
import { Prisma } from '@prisma/client';

export class CreateDriverDto
    extends IntersectionType(
        PickType(Driver, ['email', 'password', 'phone'] as const),
        DeviceInfoDto,
    )
    implements Omit<Prisma.UserCreateInput, 'username' | 'tenant'> {}

export class UpdateProfileDto extends PartialType(
    PickType(Driver, ['firstName', 'lastName', 'phone'] as const),
) {}

export class GetAllDriversDto extends PaginatedQuery {}
