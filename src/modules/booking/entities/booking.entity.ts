import { ApiProperty, PickType } from '@nestjs/swagger';
import { Booking as PrismaBooking, BookingStatus } from '@prisma/client';
import { ExposeAll } from '@/util/decorator';
import { Type } from 'class-transformer';
import type { ApiResponse, PaginatedResponse } from '@/types';
import { TripEntity } from './trip.entity';
import { PassengerEntity } from './passenger.entity';

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
    totalPrice: number;

    @ApiProperty({ type: String, nullable: true })
    boardingStopId: string | null;

    @ApiProperty({ type: String, nullable: true })
    alightingStopId: string | null;

    @ApiProperty({ type: String, nullable: true })
    paymentReference: string | null;

    @ApiProperty({ type: String, nullable: true })
    paymentMethod: string | null;

    @ApiProperty({ type: Date, nullable: true })
    paidAt: Date | null;

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
    'paymentReference',
    'paymentMethod',
    'paidAt',
    'status',
    'createdAt',
] as const) {
    @ApiProperty({ type: [PassengerEntity], required: false })
    @Type(() => PassengerEntity)
    passengers?: PassengerEntity[];

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

    @ApiProperty({ type: String })
    paymentUrl: string;
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

@ExposeAll()
class BookingPagination {
    @ApiProperty({ type: Number })
    page: number;

    @ApiProperty({ type: Number })
    limit: number;

    @ApiProperty({ type: Number })
    total: number;
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

@ExposeAll()
class BoardingStatusPassenger {
    @ApiProperty({ type: String })
    passengerId: string;

    @ApiProperty({ type: String })
    passengerName: string;

    @ApiProperty({ type: String })
    passengerCode: string;

    @ApiProperty({ type: String })
    phoneNumber: string;

    @ApiProperty({ nullable: true })
    boardedAt: Date | null;

    @ApiProperty({ nullable: true })
    seatNo: number | null;

    @ApiProperty({ type: String, enum: ['BOARDED', 'PENDING'] })
    status: 'BOARDED' | 'PENDING';
}

@ExposeAll()
class BoardingStatusData {
    @ApiProperty({ type: Number })
    totalPassengers: number;

    @ApiProperty({ type: Number })
    boardedCount: number;

    @ApiProperty({ type: Number })
    pendingCount: number;

    @ApiProperty({ type: [BoardingStatusPassenger] })
    @Type(() => BoardingStatusPassenger)
    passengers: BoardingStatusPassenger[];
}

@ExposeAll()
export class BoardingStatusApiResponse implements ApiResponse<BoardingStatusData> {
    @ApiProperty({
        type: String,
        enum: ['pending', 'success', 'failed', 'processing'],
    })
    status: 'pending' | 'success' | 'failed' | 'processing';

    @ApiProperty({ type: String })
    message: string;

    @ApiProperty({ type: BoardingStatusData })
    @Type(() => BoardingStatusData)
    data?: BoardingStatusData;
}
