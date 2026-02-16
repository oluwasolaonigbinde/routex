import {
    IsString,
    IsUUID,
    IsOptional,
    IsArray,
    ValidateNested,
    ArrayMinSize,
    IsEnum,
    ArrayMaxSize,
    IsDate,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { BookingStatus, TripStatus } from '@prisma/client';
import { PaginatedQuery } from '@/util/dto';
import { CreatePassengerDto } from '@/modules/booking/dto/passenger.dto';

export class CreateBookingDto {
    @ApiProperty({ example: 'uuid', description: 'Outbound trip ID' })
    @IsUUID()
    outboundTripId: string;

    @ApiProperty({
        example: 'uuid',
        description: 'Return trip ID',
        required: false,
    })
    @IsUUID()
    @IsOptional()
    returnTripId?: string;

    @ApiProperty({
        example: 'uuid',
        description:
            'Boarding stop location ID. If not provided, defaults to the start location of the trip',
        required: false,
    })
    @IsUUID()
    @IsOptional()
    boardingStopId?: string;

    @ApiProperty({
        example: 'uuid',
        description:
            'Alighting stop location ID. If not provided, defaults to the end location of the trip',
        required: false,
    })
    @IsUUID()
    @IsOptional()
    alightingStopId?: string;

    @ApiProperty({
        type: [CreatePassengerDto],
        description: 'List of passengers',
    })
    @IsArray()
    @ValidateNested({ each: true })
    @ArrayMinSize(1)
    @ArrayMaxSize(4)
    @Type(() => CreatePassengerDto)
    passengers: CreatePassengerDto[];
}

export class CancelBookingDto {
    @ApiProperty({ example: 'Changed travel plans', required: false })
    @IsString()
    @IsOptional()
    reason?: string;
}

export class GetBookingsQueryDto extends PaginatedQuery {
    @ApiProperty({
        enum: BookingStatus,
        required: false,
        description: 'Filter by booking status',
    })
    @IsEnum(BookingStatus)
    @IsOptional()
    status?: BookingStatus;

    @ApiProperty({
        enum: TripStatus,
        required: false,
        description: 'Filter by trip status',
    })
    @IsEnum(TripStatus)
    @IsOptional()
    tripStatus?: TripStatus;
}

export class CreateBookingFromScheduleDto {
    @ApiProperty({ example: 'uuid', description: 'Trip schedule ID' })
    @IsUUID()
    tripScheduleId: string;

    @ApiProperty({
        example: '2026-03-01',
        description: 'Departure date in YYYY-MM-DD format',
    })
    @Type(() => Date)
    @IsDate({
        message:
            'departureDate must be a valid date string in YYYY-MM-DD format',
    })
    departureDate: Date;

    @ApiProperty({
        example: 'uuid',
        description:
            'Boarding stop location ID. Defaults to the start location of the trip if not provided',
        required: false,
    })
    @IsUUID()
    @IsOptional()
    boardingStopId?: string;

    @ApiProperty({
        example: 'uuid',
        description:
            'Alighting stop location ID. Defaults to the end location of the trip if not provided',
        required: false,
    })
    @IsUUID()
    @IsOptional()
    alightingStopId?: string;

    @ApiProperty({
        type: [CreatePassengerDto],
        description: 'List of passengers',
    })
    @IsArray()
    @ValidateNested({ each: true })
    @ArrayMinSize(1)
    @ArrayMaxSize(4)
    @Type(() => CreatePassengerDto)
    passengers: CreatePassengerDto[];
}

export class VerifyPaymentDto {
    @ApiProperty({ example: 'paystack_reference' })
    @IsString()
    reference: string;
}
