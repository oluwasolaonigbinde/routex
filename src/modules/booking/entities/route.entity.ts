import { ExposeAll } from '@/util/decorator';
import { ApiProperty, PickType } from '@nestjs/swagger';
import { StopRole } from '@prisma/client';
import { Type } from 'class-transformer';
import {
    Location as PrismaLocation,
    RouteStop as PrismaRouteStop,
    Route as PrismaRoute,
} from '@prisma/client';
import { ApiResponse } from '@/types';

// ========== Base Entities ==========

export class Location implements PrismaLocation {
    @ApiProperty({ type: String })
    id: string;

    @ApiProperty({ type: String })
    name: string;

    @ApiProperty({ type: Number })
    latitude: number;

    @ApiProperty({ type: Number })
    longitude: number;
}

@ExposeAll()
export class LocationEntity extends PickType(Location, [
    'id',
    'name',
    'latitude',
    'longitude',
] as const) {}

export class RouteStop implements PrismaRouteStop {
    @ApiProperty({ type: String })
    id: string;

    @ApiProperty({ type: String })
    routeId: string;

    @ApiProperty({ type: String })
    stopId: string;

    @ApiProperty({ type: Number })
    sequence: number;

    @ApiProperty({ enum: StopRole })
    role: StopRole;

    @ApiProperty({ type: Number, nullable: true })
    departureOffsetMin: number | null;
}

@ExposeAll()
export class RouteStopEntity extends PickType(RouteStop, [
    'id',
    'routeId',
    'stopId',
    'sequence',
    'role',
    'departureOffsetMin',
] as const) {
    @ApiProperty({ type: LocationEntity, required: false })
    @Type(() => LocationEntity)
    stop?: LocationEntity;
}

export class Route implements PrismaRoute {
    @ApiProperty({ type: String })
    id: string;

    @ApiProperty({ type: String })
    code: string;

    @ApiProperty({ type: String })
    startLocationId: string;

    @ApiProperty({ type: String })
    endLocationId: string;

    @ApiProperty({ type: Number })
    basePrice: number;

    @ApiProperty({ type: Number })
    distanceKm: number;

    @ApiProperty({ type: Number })
    estimatedDurationMin: number;
}

@ExposeAll()
export class RouteEntity extends PickType(Route, [
    'id',
    'code',
    'startLocationId',
    'endLocationId',
    'basePrice',
    'distanceKm',
    'estimatedDurationMin',
] as const) {
    @ApiProperty({ type: LocationEntity, required: false })
    @Type(() => LocationEntity)
    startLocation?: LocationEntity;

    @ApiProperty({ type: LocationEntity, required: false })
    @Type(() => LocationEntity)
    endLocation?: LocationEntity;

    @ApiProperty({ type: [RouteStopEntity], required: false })
    @Type(() => RouteStopEntity)
    routeStops?: RouteStopEntity[];
}

@ExposeAll()
export class RouteWithoutStopsEntity extends PickType(Route, [
    'id',
    'code',
    'startLocationId',
    'endLocationId',
    'basePrice',
    'distanceKm',
    'estimatedDurationMin',
] as const) {
    @ApiProperty({ type: LocationEntity, required: false })
    @Type(() => LocationEntity)
    startLocation?: LocationEntity;

    @ApiProperty({ type: LocationEntity, required: false })
    @Type(() => LocationEntity)
    endLocation?: LocationEntity;
}

// ========== ApiResponse Wrappers ==========

@ExposeAll()
export class LocationEntityApiResponse implements ApiResponse<LocationEntity> {
    @ApiProperty({
        type: String,
        enum: ['pending', 'success', 'failed', 'processing'],
    })
    status: 'pending' | 'success' | 'failed' | 'processing';

    @ApiProperty({ type: String })
    message: string;

    @ApiProperty({ type: LocationEntity })
    @Type(() => LocationEntity)
    data?: LocationEntity;
}

@ExposeAll()
class PaginatedLocationResult {
    @ApiProperty({ type: Number })
    totalCount: number;

    @ApiProperty({ type: Number })
    page: number;

    @ApiProperty({ type: Number })
    limit: number;

    @ApiProperty({ type: [LocationEntity] })
    @Type(() => LocationEntity)
    results: LocationEntity[];
}

@ExposeAll()
export class LocationListApiResponse implements ApiResponse<PaginatedLocationResult> {
    @ApiProperty({
        type: String,
        enum: ['pending', 'success', 'failed', 'processing'],
    })
    status: 'pending' | 'success' | 'failed' | 'processing';

    @ApiProperty({ type: String })
    message: string;

    @ApiProperty({ type: PaginatedLocationResult })
    @Type(() => PaginatedLocationResult)
    data?: PaginatedLocationResult;
}

@ExposeAll()
export class RouteEntityApiResponse implements ApiResponse<RouteEntity> {
    @ApiProperty({
        type: String,
        enum: ['pending', 'success', 'failed', 'processing'],
    })
    status: 'pending' | 'success' | 'failed' | 'processing';

    @ApiProperty({ type: String })
    message: string;

    @ApiProperty({ type: RouteEntity })
    @Type(() => RouteEntity)
    data?: RouteEntity;
}

@ExposeAll()
class PaginatedRouteResult {
    @ApiProperty({ type: Number })
    totalCount: number;

    @ApiProperty({ type: Number })
    page: number;

    @ApiProperty({ type: Number })
    limit: number;

    @ApiProperty({ type: [RouteEntity] })
    @Type(() => RouteEntity)
    results: RouteEntity[];
}

@ExposeAll()
export class RouteListApiResponse implements ApiResponse<PaginatedRouteResult> {
    @ApiProperty({
        type: String,
        enum: ['pending', 'success', 'failed', 'processing'],
    })
    status: 'pending' | 'success' | 'failed' | 'processing';

    @ApiProperty({ type: String })
    message: string;

    @ApiProperty({ type: PaginatedRouteResult })
    @Type(() => PaginatedRouteResult)
    data?: PaginatedRouteResult;
}

@ExposeAll()
export class RouteStopEntityApiResponse implements ApiResponse<RouteStopEntity> {
    @ApiProperty({
        type: String,
        enum: ['pending', 'success', 'failed', 'processing'],
    })
    status: 'pending' | 'success' | 'failed' | 'processing';

    @ApiProperty({ type: String })
    message: string;

    @ApiProperty({ type: RouteStopEntity })
    @Type(() => RouteStopEntity)
    data?: RouteStopEntity;
}

@ExposeAll()
export class RouteStopListApiResponse implements ApiResponse<
    RouteStopEntity[]
> {
    @ApiProperty({
        type: String,
        enum: ['pending', 'success', 'failed', 'processing'],
    })
    status: 'pending' | 'success' | 'failed' | 'processing';

    @ApiProperty({ type: String })
    message: string;

    @ApiProperty({ type: [RouteStopEntity] })
    @Type(() => RouteStopEntity)
    data?: RouteStopEntity[];
}
