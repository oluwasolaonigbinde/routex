import { ApiProperty } from '@nestjs/swagger';
import { Tenant } from '@prisma/client';
import { IsEnum, IsJSON, IsString } from 'class-validator';
import { NotificationType } from '../event/enum';

export class CreateInAppNotificationDTO {
    @IsEnum(NotificationType)
    @ApiProperty({ enum: NotificationType })
    type: NotificationType;

    @IsString()
    @ApiProperty({ type: String })
    userId: string;

    @IsString()
    @ApiProperty({ type: String })
    title: string;

    @IsString()
    @ApiProperty({ type: String })
    message: string;

    @IsJSON()
    @ApiProperty({ type: Object, required: false })
    metadata?: Record<string, any>;

    @IsEnum(Tenant)
    @ApiProperty({ enum: Tenant })
    tenant: Tenant;
}
