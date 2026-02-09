import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '@/modules/database/database.service';
import { Prisma } from '@prisma/client';
import { CreateInAppNotificationDTO } from '../dto/create-in-app-notification';
import { GetNotificationsDto } from '../dto/notification.dto';

@Injectable()
export class InAppNotificationService {
    constructor(private readonly databaseService: DatabaseService) {}

    async getNotification(notificationId: string) {
        const notification = await this.databaseService.notification.findUnique(
            {
                where: { id: notificationId },
            },
        );

        if (!notification) {
            throw new NotFoundException(
                `Notificaiton with ID ${notificationId} not found`,
            );
        }

        return notification;
    }

    async create(input: CreateInAppNotificationDTO) {
        return this.databaseService.notification.create({
            data: {
                userId: input.userId,
                tenant: input.tenant,
                type: input.type,
                title: input.title,
                message: input.message,
                metadata: input.metadata,
            },
        });
    }

    async markAsRead(notificationId: string, userId: string) {
        await this.getNotification(notificationId);

        return this.databaseService.notification.updateMany({
            where: {
                id: notificationId,
                userId,
            },
            data: {
                isRead: true,
            },
        });
    }

    async markAllAsRead(userId: string) {
        return this.databaseService.notification.updateMany({
            where: {
                userId,
                isRead: false,
            },
            data: {
                isRead: true,
            },
        });
    }

    async getUnread(userId: string) {
        return this.databaseService.notification.findMany({
            where: {
                userId,
                isRead: false,
            },
            orderBy: {
                createdAt: 'desc',
            },
        });
    }

    async getAll(filter: GetNotificationsDto) {
        const { page, limit } = filter;
        const skip = (page - 1) * limit;

        const where: Prisma.NotificationWhereInput = {
            userId: filter.userId,
            isRead: filter.isRead,
            type: filter.type,
        };

        const [notifications, totalCount] = await Promise.all([
            this.databaseService.notification.findMany({
                where,
                skip,
                take: limit,
                orderBy: {
                    createdAt: 'desc',
                },
            }),
            this.databaseService.notification.count({ where }),
        ]);

        return {
            totalCount,
            page,
            limit,
            results: notifications,
        };
    }

    async getSummary(userId: string) {
        const [totalCount, unreadCount, readCount] = await Promise.all([
            this.databaseService.notification.count({
                where: { userId },
            }),
            this.databaseService.notification.count({
                where: { userId, isRead: false },
            }),
            this.databaseService.notification.count({
                where: { userId, isRead: true },
            }),
        ]);

        return {
            total: totalCount,
            unread: unreadCount,
            read: readCount,
        };
    }
}
