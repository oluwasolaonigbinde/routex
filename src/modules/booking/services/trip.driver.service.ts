import { DriverSearchPassengerTripsDto } from '@/modules/booking/dto/trip.driver.dto';
import { SearchTripsDto } from '@/modules/booking/dto/trip.dto';
import { PassengerTrip } from '@/modules/booking/entities/passenger.entity';
import { TripService } from '@/modules/booking/services/trip.service';
import { DatabaseService } from '@/modules/database/database.service';
import { PaginatedResponse } from '@/types';
import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

@Injectable()
export class TripDriverService {
    constructor(
        private readonly db: DatabaseService,
        private readonly tripService: TripService,
    ) {}

    async getTripById(id: string) {
        return this.tripService.getTripById(id);
    }

    async searchTrips(filters: SearchTripsDto) {
        return this.tripService.searchTrips(filters);
    }

    async getPassengerTrips(
        tripId: string,
        driverId: string,
        filters: DriverSearchPassengerTripsDto,
    ): Promise<PaginatedResponse<PassengerTrip>['data']> {
        const { page, limit } = filters;
        const skip = (page - 1) * limit;

        const where: Prisma.PassengerTripWhereInput = {
            tripId,
            trip: {
                driverId: driverId,
                status: {
                    in: ['SCHEDULED', 'BOARDING', 'IN_PROGRESS'],
                },
            },
            status: {
                notIn: ['CANCELLED', 'RESERVED'],
            },
        };

        const [passengerTrips, totalCount] = await Promise.all([
            this.db.passengerTrip.findMany({
                where,
                include: {
                    passenger: true,
                },
                orderBy: [
                    { passenger: { lastName: 'asc' } },
                    { passenger: { firstName: 'asc' } },
                ],
                skip,
                take: limit,
            }),
            this.db.passengerTrip.count({ where }),
        ]);

        return {
            totalCount,
            page,
            limit,
            results: passengerTrips,
            perPage: passengerTrips.length,
        };
    }
}
