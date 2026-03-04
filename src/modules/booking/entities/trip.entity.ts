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
import { ApiResponse, PaginatedResponse } from '@/types';
import { IsEnum, IsNumber, IsUUID } from 'class-validator';
import {
    LocationEntity,
    RouteEmbedEntity,
    RouteEntity,
} from '@/modules/booking/entities/route.entity';
import { VehicleEntity } from '@/modules/booking/entities/vehicle.entity';

export class TripSchedule implements PrismaTripSchedule {
    @ApiProperty({ type: String })
    id: string;

    @ApiProperty({ type: String })
    routeId: string;

    @ApiProperty({ type: String })
    vehicleId: string;

    @ApiProperty({ type: String })
    departureTime: string;

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
    'startDate',
    'endDate',
    'recurrence',
    'daysOfWeek',
    'isActive',
] as const) {
    @ApiProperty({ type: VehicleEntity })
    @Type(() => VehicleEntity)
    vehicle: VehicleEntity;
}

export class TripStopStatus implements PrismaTripStopStatus {
    @ApiProperty({ type: String })
    @IsUUID()
    id: string;

    @ApiProperty({ type: String })
    @IsUUID()
    tripId: string;

    @ApiProperty({ type: String })
    @IsUUID()
    stopId: string;

    @ApiProperty({ type: Number })
    @IsNumber()
    sequence: number;

    @ApiProperty({ enum: StopStatus })
    @IsEnum(StopStatus)
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

    @ApiProperty({ type: String })
    @IsUUID()
    startLocationId: string;

    @ApiProperty({ type: String })
    @IsUUID()
    endLocationId: string;

    @ApiProperty({ type: Date })
    departureTime: Date;

    @ApiProperty({ type: Date, nullable: true })
    boardingOpensAt: Date | null;

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
    'driverId',
] as const) {
    @ApiProperty({ type: VehicleEntity })
    @Type(() => VehicleEntity)
    vehicle: VehicleEntity;

    @ApiProperty({ type: Number, description: 'Number of stops in the trip' })
    @IsNumber()
    numStops: number;

    @ApiProperty({ type: DriverEmbedEntity, nullable: true })
    @Type(() => DriverEmbedEntity)
    driver: DriverEmbedEntity | null;

    @ApiProperty({ type: RouteEmbedEntity })
    @Type(() => RouteEmbedEntity)
    route: RouteEmbedEntity;

    @ApiProperty({ type: LocationEntity })
    @Type(() => LocationEntity)
    startLocation: LocationEntity;

    @ApiProperty({ type: LocationEntity })
    @Type(() => LocationEntity)
    endLocation: LocationEntity;

    @ApiProperty({ type: [TripStopStatusEntity], required: false })
    @Type(() => TripStopStatusEntity)
    tripStopStatuses: TripStopStatusEntity[];
}

export class TripEmbedEntity extends PickType(TripEntity, [
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
    'driverId',
    'vehicle',
    'numStops',
    'driver',
    'startLocation',
    'endLocation',
    'route',
    'routeId',
] as const) {}

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

type TripPaginatedResponse = PaginatedResponse<TripEmbedEntity>['data'];
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

    @ApiProperty({ type: [TripEmbedEntity], description: 'List of trips' })
    @Type(() => TripEmbedEntity)
    results: TripEmbedEntity[];
}

@ExposeAll()
export class TripListApiResponse implements PaginatedResponse<TripEmbedEntity> {
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
