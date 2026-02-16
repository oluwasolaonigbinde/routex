import { ApiResponse } from '@/types';
import { ExposeAll } from '@/util/decorator';
import { ApiProperty, PickType } from '@nestjs/swagger';
import {
    PassengerTrip as PrismaPassengerTrip,
    Passenger as PrismaPassenger,
} from '@prisma/client';
import { Type } from 'class-transformer';
import { IsUUID } from 'class-validator';

export class Passenger implements PrismaPassenger {
    @ApiProperty({ type: String })
    id: string;

    @ApiProperty({ type: String })
    bookingId: string;

    @ApiProperty({ type: String })
    firstName: string;

    @ApiProperty({ type: String })
    lastName: string;

    @ApiProperty({ type: String })
    phoneNumber: string;

    @ApiProperty({ type: String, nullable: true })
    email: string | null;

    @ApiProperty({ type: String })
    code: string;
}

export class PassengerTrip implements PrismaPassengerTrip {
    @ApiProperty({ type: String })
    id: string;

    @ApiProperty({ type: String })
    passengerId: string;

    @ApiProperty({ type: String })
    tripId: string;

    @ApiProperty({ type: String })
    boardingToken: string;

    @ApiProperty({ type: Number, nullable: true })
    seatNo: number | null;

    @ApiProperty({ type: String })
    @IsUUID()
    alightingStopId: string;

    @ApiProperty({ type: String })
    @IsUUID()
    boardingStopId: string;

    @ApiProperty({ type: Date, nullable: true })
    boardedAt: Date | null;

    @ApiProperty({ type: Date, nullable: true })
    alightedAt: Date | null;

    @ApiProperty({ type: Date, nullable: true })
    boardingAttemptedAt: Date | null;

    @ApiProperty({ type: String, nullable: true })
    boardingFailureReason: string | null;
}

@ExposeAll()
export class PassengerEntity extends PickType(Passenger, [
    'id',
    'bookingId',
    'firstName',
    'lastName',
    'phoneNumber',
    'email',
    'code',
] as const) {}

@ExposeAll()
export class PassengerTripEntity extends PickType(PassengerTrip, [
    'id',
    'passengerId',
    'tripId',
    'seatNo',
    'boardedAt',
    'alightedAt',
    'boardingAttemptedAt',
    'boardingFailureReason',
    'alightingStopId',
    'boardingStopId',
] as const) {
    @ApiProperty({ type: PassengerEntity })
    @Type(() => PassengerEntity)
    passenger: PassengerEntity;
}

@ExposeAll()
export class UserBookingPassengerTripEntity extends PickType(PassengerTrip, [
    'id',
    'passengerId',
    'tripId',
    'seatNo',
    'boardedAt',
    'alightedAt',
    'boardingAttemptedAt',
    'boardingFailureReason',
    'boardingToken',
    'alightingStopId',
    'boardingStopId',
]) {}

@ExposeAll()
export class UserBookingPassengerEntity extends PassengerEntity {
    @ApiProperty({ type: [UserBookingPassengerTripEntity] })
    @Type(() => UserBookingPassengerTripEntity)
    passengerTrips: UserBookingPassengerTripEntity[];
}

// ========== Base Entities ==========

@ExposeAll()
export class PassengerTripApiResponse implements ApiResponse<PassengerTripEntity> {
    @ApiProperty({
        type: String,
        enum: ['pending', 'success', 'failed', 'processing'],
    })
    status: 'pending' | 'success' | 'failed' | 'processing';

    @ApiProperty({ type: String })
    message: string;

    @ApiProperty({ type: PassengerTripEntity })
    @Type(() => PassengerTripEntity)
    data?: PassengerTripEntity;
}
