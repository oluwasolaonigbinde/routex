import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '@/modules/database/database.service';
import type { Prisma } from '@prisma/client';
import {
    CreateLocationDto,
    UpdateLocationDto,
    CreateVehicleDto,
    UpdateVehicleDto,
    CreateRouteDto,
    UpdateRouteDto,
    CreateRouteStopDto,
    UpdateRouteStopDto,
    GetLocationsDto,
    GetVehiclesDto,
    GetRoutesDto,
} from '../dto/route.dto';

@Injectable()
export class RouteService {
    constructor(private readonly db: DatabaseService) {}

    // ========== LOCATIONS ==========

    async createLocation(dto: CreateLocationDto) {
        return this.db.location.create({
            data: {
                name: dto.name,
                latitude: dto.latitude,
                longitude: dto.longitude,
            },
        });
    }

    async listLocations(query: GetLocationsDto) {
        const { page, limit } = query;
        const skip = (page - 1) * limit;

        const where: Prisma.LocationWhereInput = {};

        if (query.search) {
            where.name = { contains: query.search, mode: 'insensitive' };
        }

        const [results, totalCount] = await Promise.all([
            this.db.location.findMany({
                where,
                skip,
                take: limit,
                orderBy: { name: 'asc' },
            }),
            this.db.location.count({ where }),
        ]);

        return { totalCount, page, limit, results };
    }

    async getLocation(id: string) {
        const location = await this.db.location.findUnique({ where: { id } });

        if (!location) {
            throw new NotFoundException(`Location with ID ${id} not found`);
        }

        return location;
    }

    async updateLocation(id: string, dto: UpdateLocationDto) {
        await this.getLocation(id);

        return this.db.location.update({
            where: { id },
            data: dto,
        });
    }

    async deleteLocation(id: string) {
        await this.getLocation(id);

        await this.db.location.delete({ where: { id } });
    }

    // ========== VEHICLES ==========

    async createVehicle(dto: CreateVehicleDto) {
        return this.db.vehicle.create({
            data: {
                name: dto.name,
                totalSeats: dto.totalSeats,
                type: dto.type,
            },
        });
    }

    async listVehicles(query: GetVehiclesDto) {
        const { page, limit } = query;
        const skip = (page - 1) * limit;

        const where: Prisma.VehicleWhereInput = {};

        if (query.search) {
            where.name = { contains: query.search, mode: 'insensitive' };
        }

        if (query.type) {
            where.type = query.type;
        }

        const [results, totalCount] = await Promise.all([
            this.db.vehicle.findMany({
                where,
                skip,
                take: limit,
                orderBy: { name: 'asc' },
            }),
            this.db.vehicle.count({ where }),
        ]);

        return { totalCount, page, limit, results };
    }

    async getVehicle(id: string) {
        const vehicle = await this.db.vehicle.findUnique({ where: { id } });

        if (!vehicle) {
            throw new NotFoundException(`Vehicle with ID ${id} not found`);
        }

        return vehicle;
    }

    async updateVehicle(id: string, dto: UpdateVehicleDto) {
        await this.getVehicle(id);

        return this.db.vehicle.update({
            where: { id },
            data: dto,
        });
    }

    async deleteVehicle(id: string) {
        await this.getVehicle(id);

        await this.db.vehicle.delete({ where: { id } });
    }

    // ========== ROUTES ==========

    private readonly routeIncludes = {
        startLocation: true,
        endLocation: true,
        routeStops: {
            include: { stop: true },
            orderBy: { sequence: 'asc' as const },
        },
    };

    async createRoute(dto: CreateRouteDto) {
        return this.db.route.create({
            data: {
                code: dto.code,
                startLocationId: dto.startLocationId,
                endLocationId: dto.endLocationId,
                basePrice: dto.basePrice,
                distanceKm: dto.distanceKm,
                estimatedDurationMin: dto.estimatedDurationMin,
            },
            include: {
                startLocation: true,
                endLocation: true,
            },
        });
    }

    async listRoutes(query: GetRoutesDto) {
        const { page, limit } = query;
        const skip = (page - 1) * limit;

        const where: Prisma.RouteWhereInput = {};

        if (query.startLocationId) {
            where.startLocationId = query.startLocationId;
        }

        if (query.endLocationId) {
            where.endLocationId = query.endLocationId;
        }

        const [results, totalCount] = await Promise.all([
            this.db.route.findMany({
                where,
                skip,
                take: limit,
                include: this.routeIncludes,
                orderBy: { code: 'asc' },
            }),
            this.db.route.count({ where }),
        ]);

        return { totalCount, page, limit, results };
    }

    async getRoute(id: string) {
        const route = await this.db.route.findUnique({
            where: { id },
            include: this.routeIncludes,
        });

        if (!route) {
            throw new NotFoundException(`Route with ID ${id} not found`);
        }

        return route;
    }

    async updateRoute(id: string, dto: UpdateRouteDto) {
        await this.getRoute(id);

        return this.db.route.update({
            where: { id },
            data: dto,
            include: this.routeIncludes,
        });
    }

    async deleteRoute(id: string) {
        await this.getRoute(id);

        await this.db.route.delete({ where: { id } });
    }

    // ========== ROUTE STOPS ==========

    async createRouteStop(routeId: string, dto: CreateRouteStopDto) {
        return this.db.routeStop.create({
            data: {
                routeId,
                stopId: dto.stopId,
                sequence: dto.sequence,
                role: dto.role,
                departureOffsetMin: dto.departureOffsetMin,
            },
            include: { stop: true },
        });
    }

    async listRouteStops(routeId: string) {
        return this.db.routeStop.findMany({
            where: { routeId },
            include: { stop: true },
            orderBy: { sequence: 'asc' },
        });
    }

    async updateRouteStop(stopId: string, dto: UpdateRouteStopDto) {
        return this.db.routeStop.update({
            where: { id: stopId },
            data: dto,
            include: { stop: true },
        });
    }

    async deleteRouteStop(stopId: string) {
        await this.db.routeStop.delete({ where: { id: stopId } });
    }
}
