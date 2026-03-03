import { RouteService } from '@/modules/booking/services/route.service';
import { DatabaseService } from '@/modules/database/database.service';
import {
    FavoriteRouteAlreadyExistsException,
    FavoriteRouteNotFoundException,
} from '@/modules/user/exceptions/exception';
import { PaginatedQuery } from '@/util/dto';
import { Injectable } from '@nestjs/common';

@Injectable()
export class RouteUserService {
    constructor(
        private readonly database: DatabaseService,
        private readonly routeService: RouteService,
    ) {}
    // ========== Favorite Routes ==========

    async favoriteRoute(userId: string, routeId: string) {
        await this.routeService.getRoute(routeId);

        const existing = await this.database.favoriteRoute.findUnique({
            where: { userId_routeId: { userId, routeId } },
        });

        if (existing) {
            throw new FavoriteRouteAlreadyExistsException(routeId);
        }

        return this.database.favoriteRoute.create({
            data: { userId, routeId },
            include: {
                route: { include: { startLocation: true, endLocation: true } },
            },
        });
    }

    async unfavoriteRoute(userId: string, routeId: string) {
        await this.routeService.getRoute(routeId);

        const existing = await this.database.favoriteRoute.findUnique({
            where: { userId_routeId: { userId, routeId } },
        });

        if (!existing) {
            throw new FavoriteRouteNotFoundException(routeId);
        }

        await this.database.favoriteRoute.delete({
            where: { userId_routeId: { userId, routeId } },
        });
    }

    async getFavoriteRoutes(userId: string, query: PaginatedQuery) {
        const { page, limit } = query;
        const skip = (page - 1) * limit;

        const where = { userId };

        const [results, totalCount] = await Promise.all([
            this.database.favoriteRoute.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
                include: {
                    route: {
                        include: { startLocation: true, endLocation: true },
                    },
                },
            }),
            this.database.favoriteRoute.count({ where }),
        ]);

        return { totalCount, page, limit, results, perPage: results.length };
    }
}
