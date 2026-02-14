import {
    IsString,
    IsUUID,
    IsOptional,
    IsEmail,
    IsArray,
    ValidateNested,
    ArrayMinSize,
    IsEnum,
    IsDateString,
    IsInt,
    Min,
    arrayMaxSize,
    ArrayMaxSize,
    IsDate,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BookingStatus, TripStatus } from '@prisma/client';
import { PaginatedQuery } from '@/util/dto';

export class PassengerDto {
    @ApiProperty({ example: 'John' })
    @IsString()
    firstName: string;

    @ApiProperty({ example: 'Doe' })
    @IsString()
    lastName: string;

    @ApiProperty({ example: '+2348012345678' })
    @IsString()
    phoneNumber: string;

    @ApiProperty({ example: 'john.doe@example.com', required: false })
    @IsEmail()
    @IsOptional()
    email?: string;
}

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
        description: 'Boarding stop location ID',
        required: false,
    })
    @IsUUID()
    @IsOptional()
    boardingStopId?: string;

    @ApiProperty({
        example: 'uuid',
        description: 'Alighting stop location ID',
        required: false,
    })
    @IsUUID()
    @IsOptional()
    alightingStopId?: string;

    @ApiProperty({
        type: [PassengerDto],
        description: 'List of passengers',
    })
    @IsArray()
    @ValidateNested({ each: true })
    @ArrayMinSize(1)
    @ArrayMaxSize(4)
    @Type(() => PassengerDto)
    passengers: PassengerDto[];
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

export class VerifyPaymentDto {
    @ApiProperty({ example: 'paystack_reference' })
    @IsString()
    reference: string;
}
