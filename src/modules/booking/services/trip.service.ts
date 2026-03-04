import { Injectable } from '@nestjs/common';
import { DatabaseService } from '@/modules/database/database.service';
import { Prisma } from '@prisma/client';
import { PaginatedResponse } from '@/types';
import { SearchTripsDto } from '@/modules/booking/dto/trip.dto';
import {
    TripEmbedInclude,
    TripWithStopsInclude,
} from '@/modules/booking/types';
import { TripNotFoundException } from '@/modules/booking/exceptions/trip.exception';
import {
    TripEmbedEntity,
    TripEntity,
} from '@/modules/booking/entities/trip.entity';

@Injectable()
export class TripService {
    constructor(private readonly db: DatabaseService) {}

    async searchTrips(
        filters: SearchTripsDto,
    ): Promise<PaginatedResponse<TripEmbedEntity>['data']> {
        const { page, limit } = filters;
        const skip = (page - 1) * limit;

        const where: Prisma.TripWhereInput = {
            ...(filters.startLocationId && {
                OR: [
                    { startLocationId: filters.startLocationId },
                    {
                        tripStopStatuses: {
                            some: {
                                stopId: filters.startLocationId,
                                role: {
                                    in: ['PICKUP_ONLY', 'PICKUP_AND_DROPOFF'],
                                },
                            },
                        },
                    },
                ],
            }),
            ...(filters.endLocationId && {
                OR: [
                    { endLocationId: filters.endLocationId },
                    {
                        tripStopStatuses: {
                            some: {
                                stopId: filters.endLocationId,
                                role: {
                                    in: ['DROPOFF_ONLY', 'PICKUP_AND_DROPOFF'],
                                },
                            },
                        },
                    },
                ],
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
            tripScheduleDate: filters?.scheduleDate
                ? new Date(filters.scheduleDate)
                : undefined,
            tripScheduleId: filters?.scheduleId,
        };

        const [trips, totalCount] = await Promise.all([
            this.db.trip.findMany({
                where: where,
                include: TripEmbedInclude,
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
            results: trips.map((trip) => ({
                ...trip,
                numStops: trip._count.tripStopStatuses,
            })),
            perPage: trips.length,
        };
    }

    async getTripById(id: string): Promise<TripEntity> {
        const trip = await this.db.trip.findUnique({
            where: { id },
            include: TripWithStopsInclude,
        });

        if (!trip) {
            throw new TripNotFoundException(id);
        }

        return { ...trip, numStops: trip.tripStopStatuses.length };
    }
}
