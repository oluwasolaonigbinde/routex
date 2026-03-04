import {
    TripEmbedEntity,
    TripEntity,
} from '@/modules/booking/entities/trip.entity';
import { ApiResponse, PaginatedResponse } from '@/types';
import { ExposeAll } from '@/util/decorator';
import { ApiProperty, PickType } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class UserTripEntity extends PickType(TripEntity, [
    'id',
    'code',
    'availableSeats',
    'departureTime',
    'priceOverride',
    'boardingOpensAt',
    'routeId',
    'status',
    'tripScheduleDate',
    'tripScheduleId',
    'vehicleId',
    'startLocationId',
    'endLocationId',
    'vehicle',
    'numStops',
    'route',
    'startLocation',
    'endLocation',
    'tripStopStatuses',
] as const) {}

export class UserTripEmbedEntity extends PickType(TripEmbedEntity, [
    'id',
    'code',
    'availableSeats',
    'departureTime',
    'priceOverride',
    'boardingOpensAt',
    'routeId',
    'status',
    'tripScheduleDate',
    'tripScheduleId',
    'vehicleId',
    'startLocationId',
    'endLocationId',
    'vehicle',
    'numStops',
    'startLocation',
    'endLocation',
    'route',
    'routeId',
] as const) {}

@ExposeAll()
export class UserTripEntityApiResponse implements ApiResponse<UserTripEntity> {
    @ApiProperty({
        type: String,
        enum: ['pending', 'success', 'failed', 'processing'],
    })
    status: 'pending' | 'success' | 'failed' | 'processing';

    @ApiProperty({ type: String })
    message: string;

    @ApiProperty({ type: UserTripEntity })
    @Type(() => UserTripEntity)
    data?: UserTripEntity;
}

type UserTripPaginatedResponse = PaginatedResponse<UserTripEmbedEntity>['data'];
@ExposeAll()
class UserTripListResult implements UserTripPaginatedResponse {
    @ApiProperty({ type: Number })
    totalCount: number;

    @ApiProperty({ type: Number })
    page: number;

    @ApiProperty({ type: Number })
    limit: number;

    @ApiProperty({ type: Number })
    perPage: number;

    @ApiProperty({ type: [UserTripEmbedEntity], description: 'List of trips' })
    @Type(() => UserTripEmbedEntity)
    results: UserTripEmbedEntity[];
}

@ExposeAll()
export class UserTripListApiResponse implements PaginatedResponse<UserTripEmbedEntity> {
    @ApiProperty({
        type: String,
        enum: ['pending', 'success', 'failed', 'processing'],
    })
    status: 'pending' | 'success' | 'failed' | 'processing';

    @ApiProperty({ type: String })
    message: string;

    @ApiProperty({ type: UserTripListResult })
    @Type(() => UserTripListResult)
    data: UserTripListResult;
}
