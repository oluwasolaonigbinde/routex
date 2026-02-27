import { ApiProperty, PickType } from '@nestjs/swagger';
import type { PaymentChannel } from '@/modules/payment/types/payment';
import { Booking as PrismaBooking, BookingStatus } from '@prisma/client';
import { ExposeAll } from '@/util/decorator';
import { Type } from 'class-transformer';
import type { ApiResponse, PaginatedResponse } from '@/types';
import { IsNumber, IsString, IsUUID } from 'class-validator';
import {
    PassengerTripEntity,
    UserBookingPassengerEntity,
} from '@/modules/booking/entities/passenger.entity';
import { TripEntity } from '@/modules/booking/entities/trip.entity';

// ========== Base Entities ==========

export class Booking implements PrismaBooking {
    @ApiProperty({ type: String })
    id: string;

    @ApiProperty({ type: String })
    userId: string;

    @ApiProperty({ type: String })
    outboundTripId: string;

    @ApiProperty({ type: String, nullable: true })
    returnTripId: string | null;

    @ApiProperty({ type: Number })
    @IsNumber()
    totalPrice: number;

    @ApiProperty({ type: String })
    @IsString()
    boardingStopId: string;

    @ApiProperty({ type: String })
    @IsString()
    alightingStopId: string;

    @ApiProperty({ type: Date, nullable: true })
    paidAt: Date | null;

    @ApiProperty({ type: Date, nullable: true })
    refundedAt: Date | null;

    @ApiProperty({ enum: BookingStatus })
    status: BookingStatus;

    @ApiProperty({ type: Date })
    createdAt: Date;
}

@ExposeAll()
export class BookingEntity extends PickType(Booking, [
    'id',
    'userId',
    'outboundTripId',
    'returnTripId',
    'totalPrice',
    'boardingStopId',
    'alightingStopId',
    'paidAt',
    'status',
    'createdAt',
] as const) {
    @ApiProperty({ type: [UserBookingPassengerEntity], required: false })
    @Type(() => UserBookingPassengerEntity)
    passengers?: UserBookingPassengerEntity[];

    @ApiProperty({ type: TripEntity, required: false })
    @Type(() => TripEntity)
    outboundTrip?: TripEntity;

    @ApiProperty({ type: TripEntity, required: false })
    @Type(() => TripEntity)
    returnTrip?: TripEntity;
}

// ========== ApiResponse Wrappers ==========

@ExposeAll()
export class BookingEntityApiResponse implements ApiResponse<BookingEntity> {
    @ApiProperty({
        type: String,
        enum: ['pending', 'success', 'failed', 'processing'],
    })
    status: 'pending' | 'success' | 'failed' | 'processing';

    @ApiProperty({ type: String })
    message: string;

    @ApiProperty({ type: BookingEntity })
    @Type(() => BookingEntity)
    data?: BookingEntity;
}

@ExposeAll()
class CreateBookingData {
    @ApiProperty({ type: BookingEntity })
    @Type(() => BookingEntity)
    booking: BookingEntity;

    @ApiProperty({
        description:
            'Payment channel details (card, wallet, or instant transfer)',
        discriminator: {
            propertyName: 'channel',
        },
        anyOf: [
            {
                type: 'object',
                properties: {
                    status: {
                        type: 'string',
                        enum: ['processing', 'pending', 'success', 'failed'],
                    },
                    channel: { type: 'string', enum: ['card'] },
                },
            },
            {
                type: 'object',
                properties: {
                    channel: { type: 'string', enum: ['wallet'] },
                    status: {
                        type: 'string',
                        enum: ['processing', 'pending', 'success', 'failed'],
                    },
                },
            },
            {
                type: 'object',
                properties: {
                    checkoutUrl: { type: 'string' },
                    expiresIn: { type: 'string' },
                    amount: { type: 'number' },
                    fee: { type: 'number' },
                    net: { type: 'number' },
                    reference: { type: 'string' },
                    channel: { type: 'string', enum: ['instant_transfer'] },
                    status: {
                        type: 'string',
                        enum: ['processing', 'pending', 'success', 'failed'],
                    },
                },
            },
        ],
    })
    payment: PaymentChannel;
}

@ExposeAll()
export class CreateBookingApiResponse implements ApiResponse<CreateBookingData> {
    @ApiProperty({
        type: String,
        enum: ['pending', 'success', 'failed', 'processing'],
    })
    status: 'pending' | 'success' | 'failed' | 'processing';

    @ApiProperty({ type: String })
    message: string;

    @ApiProperty({ type: CreateBookingData })
    @Type(() => CreateBookingData)
    data?: CreateBookingData;
}

type BookingPaginatedResponse = PaginatedResponse<BookingEntity>['data'];

@ExposeAll()
class BookingListResult implements BookingPaginatedResponse {
    @ApiProperty({ type: Number })
    totalCount: number;

    @ApiProperty({ type: Number })
    page: number;

    @ApiProperty({ type: Number })
    limit: number;

    @ApiProperty({ type: Number })
    perPage: number;

    @ApiProperty({ type: [BookingEntity], description: 'List of bookings' })
    @Type(() => BookingEntity)
    results: BookingEntity[];
}

@ExposeAll()
export class BookingListApiResponse implements PaginatedResponse<BookingEntity> {
    @ApiProperty({
        type: String,
        enum: ['pending', 'success', 'failed', 'processing'],
    })
    status: 'pending' | 'success' | 'failed' | 'processing';

    @ApiProperty({ type: String })
    message: string;

    @ApiProperty({ type: BookingListResult })
    @Type(() => BookingListResult)
    data: BookingListResult;
}

@ExposeAll()
export class BoardingPassEntry {
    @ApiProperty({ type: String })
    passengerId: string;

    @ApiProperty({ type: String })
    passengerName: string;

    @ApiProperty({ type: String })
    passengerCode: string;

    @ApiProperty({ type: String })
    tripId: string;

    @ApiProperty({ type: String })
    tripCode: string;

    @ApiProperty({ type: String })
    routeCode: string;

    @ApiProperty({ type: String })
    qrCodeData: string;

    @ApiProperty({ type: Date, nullable: true })
    boardedAt: Date | null;

    @ApiProperty({ type: Number, nullable: true })
    seatNo: number | null;
}

@ExposeAll()
export class BoardingPassListResponse implements ApiResponse<
    BoardingPassEntry[]
> {
    @ApiProperty({
        type: String,
        enum: ['pending', 'success', 'failed', 'processing'],
    })
    status: 'pending' | 'success' | 'failed' | 'processing';

    @ApiProperty({ type: String })
    message: string;

    @ApiProperty({ type: [BoardingPassEntry] })
    @Type(() => BoardingPassEntry)
    data?: BoardingPassEntry[];
}

// ========== Driver-specific Responses ==========

type PassengerPaginatedResponse =
    PaginatedResponse<PassengerTripEntity>['data'];

@ExposeAll()
class PassengersListResult implements PassengerPaginatedResponse {
    @ApiProperty({ type: Number })
    totalCount: number;

    @ApiProperty({ type: Number })
    page: number;

    @ApiProperty({ type: Number })
    limit: number;

    @ApiProperty({ type: Number })
    perPage: number;

    @ApiProperty({ type: [PassengerTripEntity] })
    @Type(() => PassengerTripEntity)
    results: PassengerTripEntity[];
}

@ExposeAll()
export class PassengersListApiResponse implements PaginatedResponse<PassengerTripEntity> {
    @ApiProperty({
        type: String,
        enum: ['pending', 'success', 'failed', 'processing'],
    })
    status: 'pending' | 'success' | 'failed' | 'processing';

    @ApiProperty({ type: String })
    message: string;

    @ApiProperty({ type: PassengersListResult })
    @Type(() => PassengersListResult)
    data: PassengersListResult;
}
