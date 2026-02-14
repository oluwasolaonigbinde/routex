import { ApiProperty, ApiPropertyOptional, PickType } from '@nestjs/swagger';
import {
    IsBoolean,
    IsDateString,
    IsEnum,
    IsNotEmpty,
    IsOptional,
    IsString,
} from 'class-validator';
import {
    Notification as PrismaNotification,
    Tenant,
    Prisma,
} from '@prisma/client';
import { ApiResponse } from '@/types';
import { PaginatedResponse } from '@/util/dto';
import { Type } from 'class-transformer';
import { ExposeAll } from '@/util/decorator';

export class Notification implements PrismaNotification {
    @ApiProperty()
    @IsNotEmpty()
    @IsString()
    id: string;

    @ApiProperty({ type: String })
    @IsNotEmpty()
    @IsString()
    userId: string;

    @ApiProperty({ enum: Tenant })
    @IsEnum(Tenant)
    tenant: Tenant;

    @ApiProperty({ type: String })
    @IsNotEmpty()
    @IsString()
    type: string;

    @ApiProperty()
    @IsNotEmpty()
    @IsString()
    title: string;

    @ApiProperty()
    @IsNotEmpty()
    @IsString()
    message: string;

    @ApiPropertyOptional({ type: Object, nullable: true })
    @IsOptional()
    metadata: Prisma.JsonValue | null;

    @ApiProperty({
        type: Boolean,
        description: 'Read status of the notification',
    })
    @IsBoolean()
    isRead: boolean;

    @ApiProperty({ type: Date })
    @IsDateString()
    createdAt: Date;
}

@ExposeAll()
export class NotificationEntity extends PickType(Notification, [
    'id',
    'userId',
    'type',
    'title',
    'message',
    'metadata',
    'isRead',
    'createdAt',
] as const) {}

@ExposeAll()
export class NotificationResponse implements ApiResponse<NotificationEntity> {
    @ApiProperty({ example: 'Notification retrieved successfully' })
    message: string;

    @ApiProperty({ enum: ['pending', 'success', 'failed', 'processing'] })
    status: 'pending' | 'success' | 'failed' | 'processing';

    @ApiProperty({ type: () => NotificationEntity })
    @Type(() => NotificationEntity)
    data: NotificationEntity;
}

type NotificationPaginatedResponse =
    PaginatedResponse<NotificationEntity>['data'];

@ExposeAll()
class NotificationListResult implements NotificationPaginatedResponse {
    @ApiProperty({ description: 'Number of items per page', example: 10 })
    limit: number;

    @ApiProperty({ description: 'Current page number', example: 1 })
    page: number;

    @ApiProperty({ description: 'Total number of notifications', example: 100 })
    totalCount: number;

    @ApiProperty({
        type: [NotificationEntity],
        description: 'List of notifications',
    })
    @Type(() => NotificationEntity)
    results: NotificationEntity[];
}

@ExposeAll()
export class NotificationListResponse implements PaginatedResponse<NotificationEntity> {
    @ApiProperty({ example: 'Notifications fetched successfully' })
    message: string;

    @ApiProperty({ enum: ['pending', 'success', 'failed', 'processing'] })
    status: 'pending' | 'success' | 'failed' | 'processing';

    @ApiProperty({ type: () => NotificationListResult })
    @Type(() => NotificationListResult)
    data: NotificationListResult;
}

@ExposeAll()
export class NotifcationSummary {
    @ApiProperty({ example: 100, description: 'Total number of notifications' })
    total: number;

    @ApiProperty({ example: 70, description: 'Number of read notifications' })
    read: number;

    @ApiProperty({ example: 30, description: 'Number of unread notifications' })
    unread: number;
}

@ExposeAll()
export class NotificationSummaryResponse implements ApiResponse<NotifcationSummary> {
    @ApiProperty({ example: 'Notification summary retrieved successfully' })
    message: string;

    @ApiProperty({ enum: ['pending', 'success', 'failed', 'processing'] })
    status: 'pending' | 'success' | 'failed' | 'processing';

    @ApiProperty({ type: () => NotifcationSummary })
    @Type(() => NotifcationSummary)
    data: NotifcationSummary;
}
