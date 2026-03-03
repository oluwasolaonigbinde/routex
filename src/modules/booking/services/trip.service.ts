import { Injectable } from '@nestjs/common';
import { DatabaseService } from '@/modules/database/database.service';
import { Prisma, Trip } from '@prisma/client';
import { PaginatedResponse } from '@/types';
import { SearchTripsDto } from '@/modules/booking/dto/trip.dto';
import { TripWithStopsInclude } from '@/modules/booking/types';
import { TripNotFoundException } from '@/modules/booking/exceptions/trip.exception';

@Injectable()
export class TripService {
    constructor(private readonly db: DatabaseService) {}

    async searchTrips(
        filters: SearchTripsDto,
    ): Promise<PaginatedResponse<Trip>['data']> {
        const { page, limit } = filters;
        const skip = (page - 1) * limit;

        // TODO: Factor in the start and end location of the trip

        const where: Prisma.TripWhereInput = {
            ...(filters.startLocationId && {
                tripStopStatuses: {
                    some: {
                        stopId: filters.startLocationId,
                        role: {
                            in: ['PICKUP_ONLY', 'PICKUP_AND_DROPOFF'],
                        },
                    },
                },
            }),
            ...(filters.endLocationId && {
                tripStopStatuses: {
                    some: {
                        stopId: filters.endLocationId,
                        role: {
                            in: ['DROPOFF_ONLY', 'PICKUP_AND_DROPOFF'],
                        },
                    },
                },
            }),
            ...(filters.minDate && {
                departureTime: {
                    gte: filters.minDate,
                },
            }),
            ...(filters.maxDate && {
                departureTime: {
                    ...(filters.minDate && { gte: filters.minDate }),
                    lte: filters.maxDate,
                },
            }),
            status: filters.status,
        };

        const [trips, totalCount] = await Promise.all([
            this.db.trip.findMany({
                where: where,
                include: {
                    vehicle: true,
                    route: {
                        include: {
                            startLocation: true,
                            endLocation: true,
                        },
                    },
                },
                orderBy: {
                    departureTime: 'desc',
                },
                skip,
                take: limit,
            }),
            this.db.trip.count({ where }),
        ]);

        return {
            totalCount,
            page,
            limit,
            results: trips,
            perPage: trips.length,
        };
    }

    async getTripById(id: string): Promise<Trip> {
        const trip = await this.db.trip.findUnique({
            where: { id },
            include: TripWithStopsInclude,
        });

        if (!trip) {
            throw new TripNotFoundException(id);
        }

        return trip;
    }
}
