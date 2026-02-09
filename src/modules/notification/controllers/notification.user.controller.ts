import { Controller, Get, Param, Query, Post } from '@nestjs/common';
import {
    ApiBearerAuth,
    ApiOperation,
    ApiParam,
    ApiResponse,
    ApiTags,
} from '@nestjs/swagger';
import { InAppNotificationService } from '../services/in-app-notification.service';
import type { AccessTokenDTO } from '@/types/auth';
import { Tenant } from '@/modules/auth/decorators/tenant.decorator';
import {
    NotificationListResponse,
    NotificationSummaryResponse,
} from '../entity/notifcation.entity';
import { SerializeOptions } from '@/util/decorator';
import { GetUserNotificationsDto } from '../dto/notification.user.dto';
import { User as UserToken } from '@/modules/user/decorators/user';

@ApiTags('Notifications')
@ApiBearerAuth()
@Controller('notification')
@Tenant('USER')
export class NotificationUserController {
    constructor(
        private readonly inAppNotificationService: InAppNotificationService,
    ) {}

    @Get('')
    @ApiOperation({
        summary: 'Get all notifications',
        description:
            'Retrieve all notifications for the authenticated user with pagination',
    })
    @ApiResponse({
        status: 200,
        description: 'Notifications retrieved successfully',
        type: NotificationListResponse,
    })
    @SerializeOptions({
        type: NotificationListResponse,
        strategy: 'excludeAll',
    })
    async getAllNotifications(
        @UserToken() token: AccessTokenDTO,
        @Query() query: GetUserNotificationsDto,
    ) {
        const notifications = await this.inAppNotificationService.getAll({
            ...query,
            userId: token.sub,
        });

        return {
            status: 'success',
            message: 'Notifications fetched successfully',
            data: notifications,
        };
    }

    @Get('summary')
    @ApiOperation({
        summary: 'Get notification summary',
        description:
            'Get summary statistics of notifications (total, read, unread counts)',
    })
    @ApiResponse({
        status: 200,
        description: 'Notification summary retrieved successfully',
        type: NotificationSummaryResponse,
    })
    async getSummary(@UserToken() token: AccessTokenDTO) {
        const summary = await this.inAppNotificationService.getSummary(
            token.sub,
        );

        return {
            status: 'success',
            message: 'Notification summary fetched successfully',
            data: summary,
        };
    }

    @Post(':notificationId/read')
    @ApiOperation({
        summary: 'Mark notification as read',
        description: 'Mark a specific notification as read',
    })
    @ApiParam({
        name: 'notificationId',
        description: 'Notification ID',
    })
    @ApiResponse({
        status: 200,
        description: 'Notification marked as read',
    })
    async markAsRead(
        @UserToken() token: AccessTokenDTO,
        @Param('notificationId') notificationId: string,
    ) {
        await this.inAppNotificationService.markAsRead(
            notificationId,
            token.sub,
        );

        return {
            status: 'success',
            message: 'Notification marked as read',
        };
    }

    @Post('read-all')
    @ApiOperation({
        summary: 'Mark all notifications as read',
        description:
            'Mark all unread notifications as read for the authenticated user',
    })
    @ApiResponse({
        status: 200,
        description: 'All notifications marked as read',
    })
    async markAllAsRead(@UserToken() token: AccessTokenDTO) {
        await this.inAppNotificationService.markAllAsRead(token.sub);

        return {
            status: 'success',
            message: 'All notifications marked as read',
        };
    }
}
