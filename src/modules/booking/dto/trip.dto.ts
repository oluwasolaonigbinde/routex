import {
    IsString,
    IsUUID,
    IsOptional,
    IsEnum,
    IsInt,
    IsArray,
    IsDateString,
    Min,
    Matches,
    ArrayMinSize,
    IsDate,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { TripStatus, RecurrencePattern, StopStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import { PaginatedQuery } from '@/util/dto';

export class CreateTripScheduleDto {
    @ApiProperty({ example: 'uuid', description: 'Route ID' })
    @IsUUID()
    routeId: string;

    @ApiProperty({ example: 'uuid', description: 'Vehicle ID' })
    @IsUUID()
    vehicleId: string;

    @ApiProperty({
        example: '08:30',
        description: 'Departure time in HH:mm format',
    })
    @IsString()
    @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, {
        message: 'departureTime must be in HH:mm format',
    })
    departureTime: string;

    @ApiProperty({
        example: 120,
        description: 'Estimated arrival time offset in minutes',
    })
    @IsInt()
    @Min(0)
    arrivalOffsetMin: number;

    @ApiProperty({
        example: '2026-02-20',
        description: 'Start date in YYYY-MM-DD format',
    })
    @IsDate()
    @Type(() => Date)
    startDate: Date;

    @ApiProperty({
        example: '2026-12-31',
        description: 'End date in YYYY-MM-DD format',
        required: false,
    })
    @IsDate()
    @IsOptional()
    @Type(() => Date)
    endDate?: Date;

    @ApiProperty({
        enum: RecurrencePattern,
        example: RecurrencePattern.DAILY,
    })
    @IsEnum(RecurrencePattern)
    recurrence: RecurrencePattern;

    @ApiProperty({
        example: [1, 2, 3, 4, 5],
        description:
            'Days of week (0=Sunday, 1=Monday, ..., 6=Saturday) for WEEKLY recurrence',
    })
    @IsArray()
    @IsInt({ each: true })
    @ArrayMinSize(1)
    @Type(() => Number)
    daysOfWeek: number[];
}

export class UpdateTripScheduleDto extends PartialType(CreateTripScheduleDto) {}

export class CreateAdHocTripDto {
    @ApiProperty({ example: 'uuid', description: 'Route ID' })
    @IsUUID()
    routeId: string;

    @ApiProperty({ example: 'uuid', description: 'Vehicle ID' })
    @IsUUID()
    vehicleId: string;

    @ApiProperty({
        example: '2026-02-20T08:30:00Z',
        description: 'Departure date and time',
    })
    @Type(() => Date)
    @IsDate({
        message: 'departureDate must be a valid ISO 8601 date string',
    })
    departureDate: Date;

    @ApiProperty({
        example: 50,
        description: 'Price override (optional)',
        required: false,
    })
    @IsInt()
    @Min(0)
    @IsOptional()
    priceOverride?: number;

    @ApiProperty({
        example: 'uuid',
        description: 'Driver ID (optional)',
        required: false,
    })
    @IsUUID()
    @IsOptional()
    driverId?: string;
}

export class UpdateTripStatusDto {
    @ApiProperty({
        enum: TripStatus,
        example: TripStatus.BOARDING,
    })
    @IsEnum(TripStatus)
    status: TripStatus;
}

export class AssignDriverDto {
    @ApiProperty({ example: 'uuid', description: 'Driver ID' })
    @IsUUID()
    driverId: string;
}

export class UpdateStopStatusDto {
    @ApiProperty({
        enum: StopStatus,
        example: StopStatus.ARRIVED,
    })
    @IsEnum(StopStatus)
    status: StopStatus;
}

export class BoardPassengerDto {
    @ApiProperty({
        example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        description: 'JWT boarding token',
    })
    @IsString()
    boardingToken: string;
}

export class GenerateTripsDto {
    @ApiProperty({
        example: '2026-02-20',
        description: 'Start date for trip generation',
    })
    @IsDateString()
    startDate: string;

    @ApiProperty({
        example: '2026-03-20',
        description: 'End date for trip generation',
    })
    @IsDateString()
    endDate: string;
}

export class SearchSchedulesDto extends PaginatedQuery {
    @ApiPropertyOptional({ example: 'uuid', description: 'Start location ID' })
    @IsUUID()
    @IsOptional()
    startLocationId?: string;

    @ApiPropertyOptional({ example: 'uuid', description: 'End location ID' })
    @IsUUID()
    @IsOptional()
    endLocationId?: string;

    @ApiPropertyOptional({
        example: '2026-03-01',
        description:
            'Filter schedules active on this date (checks daysOfWeek and date range)',
    })
    @IsDateString()
    @IsOptional()
    date?: string;
}

export class SearchTripsDto extends PaginatedQuery {
    @ApiPropertyOptional({ example: 'uuid', description: 'Start location ID' })
    @IsUUID()
    @IsOptional()
    startLocationId?: string;

    @ApiPropertyOptional({ example: 'uuid', description: 'End location ID' })
    @IsUUID()
    @IsOptional()
    endLocationId?: string;

    @ApiPropertyOptional({
        type: Date,
    })
    @IsDate()
    @Type(() => Date)
    @IsOptional()
    minDate?: Date;

    @ApiPropertyOptional({
        type: Date,
    })
    @IsDate()
    @Type(() => Date)
    @IsOptional()
    maxDate?: Date;

    @ApiPropertyOptional({ enum: TripStatus })
    @IsEnum(TripStatus)
    @IsOptional()
    status?: TripStatus;
}
