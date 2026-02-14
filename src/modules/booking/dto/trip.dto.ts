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
} from 'class-validator';
import { ApiProperty, PartialType } from '@nestjs/swagger';
import { TripStatus, RecurrencePattern, StopStatus } from '@prisma/client';
import { Type } from 'class-transformer';

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
    @IsDateString()
    startDate: string;

    @ApiProperty({
        example: '2026-12-31',
        description: 'End date in YYYY-MM-DD format',
        required: false,
    })
    @IsDateString()
    @IsOptional()
    endDate?: string;

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
        description: 'Departure time',
    })
    @IsDateString()
    departureTime: string;

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
