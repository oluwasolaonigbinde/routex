import { Injectable } from '@nestjs/common';
import { DatabaseService } from '@/modules/database/database.service';
import { Trip } from '@prisma/client';
import { PaginatedResponse } from '@/types';
import { TripExecutionService } from '@/modules/booking/services/trip-execution.service';
import { SearchTripsDto } from '@/modules/booking/dto/trip.dto';
import { TripEntity } from '@/modules/booking/entities/trip.entity';
import { TripService } from '@/modules/booking/services/trip.service';

@Injectable()
export class TripUserService {
    constructor(
        private readonly db: DatabaseService,
        private readonly tripExecutionService: TripExecutionService,
        private readonly tripService: TripService,
    ) {}

    async searchTrips(
        filters: SearchTripsDto,
    ): Promise<PaginatedResponse<Trip>['data']> {
        const tripsData = await this.tripService.searchTrips(filters);

        const trips = tripsData.results.map((trip) =>
            this.stripDriverIfOutsideWindow(trip),
        );

        return { ...tripsData, results: trips };
    }

    async getTripById(id: string): Promise<TripEntity> {
        const trip = await this.tripService.getTripById(id);

        return this.stripDriverIfOutsideWindow(trip);
    }

    /**
     * Remove driver details from a trip response when
     * the current time is outside the trip's start window.
     */
    stripDriverIfOutsideWindow(trip: TripEntity): TripEntity {
        if (!this.tripExecutionService.isWithinStartWindow(trip)) {
            return { ...trip, driver: null, driverId: null };
        }
        return trip;
    }
}
