import {
    IsString,
    IsUUID,
    IsOptional,
    IsInt,
    IsEnum,
    Min,
    IsLatitude,
    IsLongitude,
    IsNumber,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Prisma, StopRole } from '@prisma/client';
import { PaginatedQuery } from '@/util/dto';

export class CreateLocationDto {
    @ApiProperty({ example: 'Ikeja Bus Terminal' })
    @IsString()
    name: string;

    @ApiProperty({ example: 6.5964 })
    @IsNumber()
    @IsLatitude()
    latitude: number;

    @ApiProperty({ example: 3.3515 })
    @IsNumber()
    @IsLongitude()
    longitude: number;
}

export class UpdateLocationDto extends PartialType(CreateLocationDto) {}

export class CreateVehicleDto {
    @ApiProperty({ example: 'Toyota Hiace - ABC 123 DE' })
    @IsString()
    name: string;

    @ApiProperty({ example: 14, description: 'Total number of seats' })
    @IsInt()
    @Min(1)
    totalSeats: number;

    @ApiProperty({
        example: 'Bus',
        description: 'Vehicle type',
        required: false,
    })
    @IsString()
    @IsOptional()
    type?: string;
}

export class UpdateVehicleDto extends PartialType(CreateVehicleDto) {}

export class CreateRouteDto implements Prisma.RouteUncheckedCreateInput {
    @ApiProperty({ example: 'LAG-IBD-001', description: 'Route code' })
    @IsString()
    code: string;

    @ApiProperty({ example: 'uuid', description: 'Start location ID' })
    @IsUUID()
    startLocationId: string;

    @ApiProperty({ example: 'uuid', description: 'End location ID' })
    @IsUUID()
    endLocationId: string;

    @ApiProperty({
        example: 50,
        description: 'Base price for one seat (in cents/kobo)',
    })
    @IsInt()
    @Min(0)
    basePrice: number;

    @ApiProperty({
        example: 120,
        description: 'Distance in kilometers',
    })
    @IsInt()
    @Min(0)
    distanceKm: number;

    @ApiProperty({
        example: 180,
        description: 'Estimated duration in minutes',
    })
    @IsInt()
    @Min(0)
    estimatedDurationMin: number;
}

export class UpdateRouteDto extends PartialType(CreateRouteDto) {}

export class CreateRouteStopDto
    implements Prisma.RouteStopUncheckedCreateInput
{
    @ApiProperty({ example: 'uuid', description: 'Route ID' })
    @IsUUID()
    routeId: string;

    @ApiProperty({ example: 'uuid', description: 'Stop location ID' })
    @IsUUID()
    stopId: string;

    @ApiProperty({
        example: 1,
        description: 'Sequence order of this stop',
    })
    @IsInt()
    @Min(1)
    sequence: number;

    @ApiProperty({
        enum: StopRole,
        example: StopRole.PICKUP_AND_DROPOFF,
        required: false,
    })
    @IsEnum(StopRole)
    @IsOptional()
    role?: StopRole;

    @ApiProperty({
        example: 30,
        description: 'Departure time offset from route start in minutes',
        required: false,
    })
    @IsInt()
    @Min(0)
    @IsOptional()
    departureOffsetMin?: number;
}

export class UpdateRouteStopDto extends PartialType(CreateRouteStopDto) {}

// ========== QUERY DTOs ==========

export class GetLocationsDto extends PaginatedQuery {
    @IsOptional()
    @IsString()
    @ApiPropertyOptional({ description: 'Search locations by name' })
    search?: string;
}

export class GetVehiclesDto extends PaginatedQuery {
    @IsOptional()
    @IsString()
    @ApiPropertyOptional({ description: 'Search vehicles by name' })
    search?: string;

    @IsOptional()
    @IsString()
    @ApiPropertyOptional({
        description: 'Filter by vehicle type',
        example: 'BUS',
    })
    type?: string;
}

export class GetRoutesDto extends PaginatedQuery {
    @IsOptional()
    @IsUUID()
    @ApiPropertyOptional({ description: 'Filter by start location ID' })
    startLocationId?: string;

    @IsOptional()
    @IsUUID()
    @ApiPropertyOptional({ description: 'Filter by end location ID' })
    endLocationId?: string;
}
