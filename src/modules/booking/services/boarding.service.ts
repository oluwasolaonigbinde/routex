import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { DatabaseService } from '@/modules/database/database.service';
import { PassengerService } from './passenger.service';
import {
    TripNotFoundException,
    BoardingNotOpenException,
    DriverNotAssignedException,
} from '../exceptions/booking.exception';
import { PassengerBoardedEvent } from '../events/booking.events';
import { TripStatus } from '@prisma/client';

@Injectable()
export class BoardingService {
    private readonly logger = new Logger(BoardingService.name);

    constructor(
        private readonly db: DatabaseService,
        private readonly passengerService: PassengerService,
        private readonly eventEmitter: EventEmitter2,
    ) {}

    /**
     * Board a passenger (driver scans QR code)
     */
    async boardPassenger(driverId: string, boardingToken: string) {
        this.logger.log(`Driver ${driverId} boarding passenger`);

        // Decode token to get trip ID (without full validation yet)
        const decoded =
            this.passengerService.decodeBoardingToken(boardingToken);

        if (!decoded) {
            throw new Error('Invalid boarding token format');
        }

        // Verify trip exists and get details
        const trip = await this.db.trip.findUnique({
            where: { id: decoded.tripId },
            include: {
                route: true,
            },
        });

        if (!trip) {
            throw new TripNotFoundException(decoded.tripId);
        }

        // Verify driver is assigned to this trip
        if (trip.driverId !== driverId) {
            throw new DriverNotAssignedException();
        }

        // Verify trip is in BOARDING status
        if (trip.status !== TripStatus.BOARDING) {
            throw new BoardingNotOpenException();
        }

        // Now validate the token fully (signature, expiration, trip match)
        const payload = this.passengerService.validateBoardingToken(
            boardingToken,
            trip.id,
        );

        // Load passenger trip
        const passengerTrip = await this.db.passengerTrip.findUnique({
            where: { id: payload.sub },
            include: {
                passenger: true,
                trip: true,
            },
        });

        if (!passengerTrip) {
            throw new Error('Passenger trip not found');
        }

        // Idempotency check: if already boarded, return success
        if (passengerTrip.boardedAt) {
            this.logger.log(
                `Passenger ${passengerTrip.passengerId} already boarded at ${passengerTrip.boardedAt}`,
            );
            return {
                success: true,
                alreadyBoarded: true,
                passengerTrip,
            };
        }

        // Update passenger trip with boarding time
        const updatedPassengerTrip = await this.db.passengerTrip.update({
            where: { id: passengerTrip.id },
            data: {
                boardedAt: new Date(),
            },
            include: {
                passenger: true,
                trip: {
                    include: {
                        route: true,
                    },
                },
            },
        });

        // Emit event
        this.eventEmitter.emit(
            'passenger.boarded',
            new PassengerBoardedEvent(
                updatedPassengerTrip.id,
                updatedPassengerTrip.passengerId,
                trip.id,
                `${updatedPassengerTrip.passenger.firstName} ${updatedPassengerTrip.passenger.lastName}`,
                updatedPassengerTrip.boardedAt!,
            ),
        );

        return {
            success: true,
            alreadyBoarded: false,
            passengerTrip: updatedPassengerTrip,
        };
    }

    /**
     * Get boarding status for a trip
     */
    async getBoardingStatus(tripId: string): Promise<{
        totalPassengers: number;
        boardedCount: number;
        pendingCount: number;
        passengers: any[];
    }> {
        const trip = await this.db.trip.findUnique({
            where: { id: tripId },
        });

        if (!trip) {
            throw new TripNotFoundException(tripId);
        }

        const passengerTrips = await this.db.passengerTrip.findMany({
            where: { tripId },
            include: {
                passenger: true,
            },
            orderBy: {
                boardedAt: 'asc',
            },
        });

        const boardedCount = passengerTrips.filter(
            (pt) => pt.boardedAt !== null,
        ).length;

        const passengers = passengerTrips.map((pt) => ({
            passengerId: pt.passengerId,
            passengerName: `${pt.passenger.firstName} ${pt.passenger.lastName}`,
            passengerCode: pt.passenger.code,
            phoneNumber: pt.passenger.phoneNumber,
            boardedAt: pt.boardedAt,
            seatNo: pt.seatNo,
            status: pt.boardedAt ? 'BOARDED' : 'PENDING',
        }));

        return {
            totalPassengers: passengerTrips.length,
            boardedCount,
            pendingCount: passengerTrips.length - boardedCount,
            passengers,
        };
    }

    /**
     * Record a failed boarding attempt
     */
    async recordBoardingFailure(
        passengerTripId: string,
        reason: string,
    ): Promise<void> {
        await this.db.passengerTrip.update({
            where: { id: passengerTripId },
            data: {
                boardingAttemptedAt: new Date(),
                boardingFailureReason: reason,
            },
        });
    }
}
