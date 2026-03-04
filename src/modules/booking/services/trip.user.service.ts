import { Injectable } from '@nestjs/common';
import { PaginatedResponse } from '@/types';
import { TripExecutionService } from '@/modules/booking/services/trip-execution.service';
import { SearchTripsDto } from '@/modules/booking/dto/trip.dto';
import {
    TripEmbedEntity,
    TripEntity,
} from '@/modules/booking/entities/trip.entity';
import { TripService } from '@/modules/booking/services/trip.service';
import { DriverEmbedEntity } from '@/modules/driver/entities/driver.entity';
import { TripDriverNotAvailableException } from '@/modules/booking/exceptions/trip.exception';

@Injectable()
export class TripUserService {
    constructor(
        private readonly tripExecutionService: TripExecutionService,
        private readonly tripService: TripService,
    ) {}

    async searchTrips(
        filters: SearchTripsDto,
    ): Promise<PaginatedResponse<TripEmbedEntity>['data']> {
        return this.tripService.searchTrips(filters);
    }

    async getTripById(id: string): Promise<TripEntity> {
        return this.tripService.getTripById(id);
    }

    async getTripDriver(id: string): Promise<DriverEmbedEntity | null> {
        const trip = await this.tripService.getTripById(id);

        if (!this.tripExecutionService.isWithinStartWindow(trip)) {
            throw new TripDriverNotAvailableException();
        }

        return trip.driver ?? null;
    }
}
