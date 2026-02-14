import { ExposeAll } from '@/util/decorator';
import { ApiProperty, PickType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
    Trip as PrismaTrip,
    TripStatus,
    TripSchedule as PrismaTripSchedule,
    RecurrencePattern,
    TripStopStatus as PrismaTripStopStatus,
    StopStatus,
    StopRole,
} from '@prisma/client';
import { DriverEmbedEntity } from '@/modules/driver/entities/driver.entity';
import { PassengerTripEntity } from './passenger.entity';
import { LocationEntity, RouteEntity } from './route.entity';
import { ApiResponse, PaginatedResponse } from '@/types';
import { VehicleEntity } from './vehicle.entity';
import { IsEnum } from 'class-validator';

export class TripSchedule implements PrismaTripSchedule {
    @ApiProperty({ type: String })
    id: string;

    @ApiProperty({ type: String })
    routeId: string;

    @ApiProperty({ type: String })
    vehicleId: string;

    @ApiProperty({ type: String })
    departureTime: string;

    @ApiProperty({ type: Number })
    arrivalOffsetMin: number;

    @ApiProperty({ type: Date })
    startDate: Date;

    @ApiProperty({ type: Date, nullable: true })
    endDate: Date | null;

    @ApiProperty({ enum: RecurrencePattern })
    recurrence: RecurrencePattern;

    @ApiProperty({ type: [Number] })
    daysOfWeek: number[];

    @ApiProperty({ type: Boolean })
    isActive: boolean;
}
@ExposeAll()
export class TripScheduleEntity extends PickType(TripSchedule, [
    'id',
    'routeId',
    'vehicleId',
    'departureTime',
    'arrivalOffsetMin',
    'startDate',
    'endDate',
    'recurrence',
    'daysOfWeek',
    'isActive',
] as const) {
    @ApiProperty({ type: RouteEntity, required: false })
    @Type(() => RouteEntity)
    route?: RouteEntity;

    @ApiProperty({ type: VehicleEntity, required: false })
    @Type(() => VehicleEntity)
    vehicle?: VehicleEntity;
}

export class TripStopStatus implements PrismaTripStopStatus {
    @ApiProperty({ type: String })
    id: string;

    @ApiProperty({ type: String })
    tripId: string;

    @ApiProperty({ type: String })
    stopId: string;

    @ApiProperty({ type: Number })
    sequence: number;

    @ApiProperty({ enum: StopStatus })
    status: StopStatus;

    @ApiProperty({ enum: StopRole })
    @IsEnum(StopRole)
    role: StopRole;

    @ApiProperty({ type: Date, nullable: true })
    actualArrival: Date | null;

    @ApiProperty({ type: Date, nullable: true })
    actualDeparture: Date | null;
}

@ExposeAll()
export class TripStopStatusEntity extends PickType(TripStopStatus, [
    'id',
    'tripId',
    'stopId',
    'sequence',
    'status',
    'actualArrival',
    'role',
    'actualDeparture',
] as const) {
    @ApiProperty({ type: LocationEntity, required: false })
    @Type(() => LocationEntity)
    stop?: LocationEntity;
}

export class Trip implements PrismaTrip {
    @ApiProperty({ type: String })
    id: string;

    @ApiProperty({ type: String })
    code: string;

    @ApiProperty({ type: String })
    routeId: string;

    @ApiProperty({ type: String })
    vehicleId: string;

    @ApiProperty({ type: String, nullable: true })
    driverId: string | null;

    @ApiProperty({ type: Date })
    departureTime: Date;

    @ApiProperty({ type: Number })
    availableSeats: number;

    @ApiProperty({ type: Number, nullable: true })
    priceOverride: number | null;

    @ApiProperty({ enum: TripStatus })
    status: TripStatus;

    @ApiProperty({ type: String, nullable: true })
    tripScheduleId: string | null;

    @ApiProperty({ type: Date, nullable: true })
    tripScheduleDate: Date | null;

    @ApiProperty({ type: RouteEntity, required: false })
    @Type(() => RouteEntity)
    route?: RouteEntity;
}

@ExposeAll()
export class TripEntity extends PickType(Trip, [
    'availableSeats',
    'code',
    'departureTime',
    'id',
    'priceOverride',
    'routeId',
    'status',
    'tripScheduleDate',
    'tripScheduleId',
    'vehicleId',
] as const) {
    @ApiProperty({ type: VehicleEntity, required: false })
    @Type(() => VehicleEntity)
    vehicle?: VehicleEntity;

    @ApiProperty({ type: DriverEmbedEntity, required: false, nullable: true })
    @Type(() => DriverEmbedEntity)
    driver?: DriverEmbedEntity | null;

    @ApiProperty({ type: RouteEntity, required: false })
    @Type(() => RouteEntity)
    route?: RouteEntity;

    @ApiProperty({ type: [TripStopStatusEntity], required: false })
    @Type(() => TripStopStatusEntity)
    tripStopStatuses?: TripStopStatusEntity[];

    @ApiProperty({ type: [PassengerTripEntity], required: false })
    @Type(() => PassengerTripEntity)
    passengerTrips?: PassengerTripEntity[];
}

// ========== ApiResponse Wrappers ==========

@ExposeAll()
export class TripEntityApiResponse implements ApiResponse<TripEntity> {
    @ApiProperty({
        type: String,
        enum: ['pending', 'success', 'failed', 'processing'],
    })
    status: 'pending' | 'success' | 'failed' | 'processing';

    @ApiProperty({ type: String })
    message: string;

    @ApiProperty({ type: TripEntity })
    @Type(() => TripEntity)
    data?: TripEntity;
}

type TripPaginatedResponse = PaginatedResponse<TripEntity>['data'];
@ExposeAll()
class TripListResult implements TripPaginatedResponse {
    @ApiProperty({ type: Number })
    totalCount: number;

    @ApiProperty({ type: Number })
    page: number;

    @ApiProperty({ type: Number })
    limit: number;

    @ApiProperty({ type: Number })
    perPage: number;

    @ApiProperty({ type: [TripEntity], description: 'List of trips' })
    @Type(() => TripEntity)
    results: TripEntity[];
}

@ExposeAll()
export class TripListApiResponse implements PaginatedResponse<TripEntity> {
    @ApiProperty({
        type: String,
        enum: ['pending', 'success', 'failed', 'processing'],
    })
    status: 'pending' | 'success' | 'failed' | 'processing';

    @ApiProperty({ type: String })
    message: string;

    @ApiProperty({ type: TripListResult })
    @Type(() => TripListResult)
    data: TripListResult;
}

@ExposeAll()
export class TripScheduleEntityApiResponse implements ApiResponse<TripScheduleEntity> {
    @ApiProperty({
        type: String,
        enum: ['pending', 'success', 'failed', 'processing'],
    })
    status: 'pending' | 'success' | 'failed' | 'processing';

    @ApiProperty({ type: String })
    message: string;

    @ApiProperty({ type: TripScheduleEntity })
    @Type(() => TripScheduleEntity)
    data?: TripScheduleEntity;
}

@ExposeAll()
export class TripScheduleListApiResponse implements ApiResponse<
    TripScheduleEntity[]
> {
    @ApiProperty({
        type: String,
        enum: ['pending', 'success', 'failed', 'processing'],
    })
    status: 'pending' | 'success' | 'failed' | 'processing';

    @ApiProperty({ type: String })
    message: string;

    @ApiProperty({ type: [TripScheduleEntity] })
    @Type(() => TripScheduleEntity)
    data?: TripScheduleEntity[];
}

@ExposeAll()
class GenerateTripsData {
    @ApiProperty({ type: Number })
    count: number;
}

@ExposeAll()
export class GenerateTripsApiResponse implements ApiResponse<GenerateTripsData> {
    @ApiProperty({
        type: String,
        enum: ['pending', 'success', 'failed', 'processing'],
    })
    status: 'pending' | 'success' | 'failed' | 'processing';

    @ApiProperty({ type: String })
    message: string;

    @ApiProperty({ type: GenerateTripsData })
    @Type(() => GenerateTripsData)
    data?: GenerateTripsData;
}

@ExposeAll()
export class TripStopStatusApiResponse implements ApiResponse<TripStopStatusEntity> {
    @ApiProperty({
        type: String,
        enum: ['pending', 'success', 'failed', 'processing'],
    })
    status: 'pending' | 'success' | 'failed' | 'processing';

    @ApiProperty({ type: String })
    message: string;

    @ApiProperty({ type: TripStopStatusEntity })
    @Type(() => TripStopStatusEntity)
    data?: TripStopStatusEntity;
}
