import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { DatabaseService } from '@/modules/database/database.service';
import { TripStatus, StopStatus } from '@prisma/client';
import { DriverService } from '@/modules/driver/driver.service';
import { BookingEvent } from '@/modules/booking/types/event';
import { TripWithStopsInclude } from '@/modules/booking/types';
import {
    Trip,
    TripEntity,
    TripStopStatus,
} from '@/modules/booking/entities/trip.entity';
import {
    DriverNotAssignedException,
    InvalidBoardingTokenException,
    InvalidTripStateException,
    InvalidTripTransitionException,
    TripNotFoundException,
    TripStartWindowException,
} from '@/modules/booking/exceptions/trip.exception';
import { PassengerService } from '@/modules/booking/services/passenger.service';
import {
    DriverAssignedEvent,
    PassengerAlightedEvent,
    PassengerBoardedEvent,
    StopStatusUpdatedEvent,
    TripBoardingOpenEvent,
    TripCompletedEvent,
    TripStartedEvent,
} from '@/modules/booking/events/trip.events';

@Injectable()
export class TripExecutionService {
    private readonly logger = new Logger(TripExecutionService.name);

    // Define valid state transitions
    private readonly validTransitions: Record<TripStatus, TripStatus[]> = {
        [TripStatus.SCHEDULED]: [TripStatus.BOARDING, TripStatus.CANCELLED],
        [TripStatus.BOARDING]: [TripStatus.IN_PROGRESS, TripStatus.CANCELLED],
        [TripStatus.IN_PROGRESS]: [TripStatus.COMPLETED],
        [TripStatus.COMPLETED]: [],
        [TripStatus.CANCELLED]: [],
    };

    // Define valid stop status transitions
    private readonly validStopTransitions: Record<StopStatus, StopStatus[]> = {
        [StopStatus.PENDING]: [StopStatus.ARRIVED, StopStatus.SKIPPED],
        [StopStatus.ARRIVED]: [StopStatus.DEPARTED, StopStatus.SKIPPED],
        [StopStatus.DEPARTED]: [],
        [StopStatus.SKIPPED]: [],
    };

    constructor(
        private readonly db: DatabaseService,
        private readonly configService: ConfigService,
        private readonly eventEmitter: EventEmitter2,
        private readonly driverService: DriverService,
        private readonly passengerService: PassengerService,
    ) {}

    /**
     * Compute the start window boundaries for a trip.
     * Uses the stored boardingOpensAt when available, otherwise computes from config.
     */
    getWindow(trip: Pick<Trip, 'boardingOpensAt' | 'departureTime'>): {
        opens: Date;
        closes: Date;
    } {
        const beforeMin =
            this.configService.get<number>('TRIP_START_WINDOW_BEFORE_MIN') ??
            30;
        const afterMin =
            this.configService.get<number>('TRIP_START_WINDOW_AFTER_MIN') ?? 30;

        const opens = trip.boardingOpensAt
            ? trip.boardingOpensAt
            : new Date(trip.departureTime.getTime() - beforeMin * 60 * 1000);
        const closes = new Date(
            trip.departureTime.getTime() + afterMin * 60 * 1000,
        );
        return { opens, closes };
    }

    /**
     * Check whether the current time falls within the trip's start window
     */
    isWithinStartWindow(
        trip: Pick<Trip, 'boardingOpensAt' | 'departureTime'>,
    ): boolean {
        const { opens, closes } = this.getWindow(trip);
        const now = new Date();
        return now >= opens && now <= closes;
    }

    /**
     * Assign a driver to a trip
     */
    async assignDriver(tripId: string, driverId: string): Promise<TripEntity> {
        this.logger.log(`Assigning driver ${driverId} to trip ${tripId}`);

        // Verify driver exists and has DRIVER tenant
        await this.driverService.findUser({ id: driverId });

        // Fetch trip to validate state
        const existingTrip = await this.db.trip.findUnique({
            where: { id: tripId },
        });

        if (!existingTrip) {
            throw new TripNotFoundException(tripId);
        }

        // Status restrictions: Cannot assign driver to active, completed, or cancelled trips
        if (
            existingTrip.status === TripStatus.IN_PROGRESS ||
            existingTrip.status === TripStatus.COMPLETED ||
            existingTrip.status === TripStatus.CANCELLED
        ) {
            throw new InvalidTripStateException(
                `Cannot assign driver to trip with status ${existingTrip.status}`,
            );
        }

        const trip = await this.db.trip.update({
            where: { id: tripId },
            data: { driverId },
            include: TripWithStopsInclude,
        });

        this.eventEmitter.emit(
            BookingEvent.DRIVER_ASSIGNED,
            new DriverAssignedEvent(tripId, driverId, trip.code),
        );

        return { ...trip, numStops: trip.tripStopStatuses.length };
    }

    /**
     * Update trip status with state machine validation
     */
    async updateTripStatus(
        tripId: string,
        newStatus: TripStatus,
        driverId?: string,
    ): Promise<TripEntity> {
        this.logger.log(`Updating trip ${tripId} status to ${newStatus}`);

        const trip = await this.db.trip.findUnique({
            where: { id: tripId },
        });

        if (!trip) {
            throw new TripNotFoundException(tripId);
        }

        // For BOARDING and IN_PROGRESS, require driver to be assigned
        if (
            (newStatus === TripStatus.BOARDING ||
                newStatus === TripStatus.IN_PROGRESS) &&
            driverId
        ) {
            if (trip.driverId !== driverId) {
                throw new DriverNotAssignedException();
            }
        }

        // Validate transition
        const allowedTransitions = this.validTransitions[trip.status];
        if (!allowedTransitions.includes(newStatus)) {
            throw new InvalidTripTransitionException(trip.status, newStatus);
        }

        // Enforce start-window when opening boarding
        if (newStatus === TripStatus.BOARDING) {
            if (!this.isWithinStartWindow(trip)) {
                const { opens, closes } = this.getWindow(trip);
                throw new TripStartWindowException(opens, closes);
            }
        }

        const updatedTrip = await this.db.trip.update({
            where: { id: tripId },
            data: { status: newStatus },
            include: TripWithStopsInclude,
        });

        const updatedTripWithCount = {
            ...updatedTrip,
            numStops: updatedTrip.tripStopStatuses.length,
        };

        // Emit appropriate events
        switch (newStatus) {
            case TripStatus.BOARDING:
                this.eventEmitter.emit(
                    BookingEvent.TRIP_BOARDING_OPENED,
                    new TripBoardingOpenEvent(
                        tripId,
                        trip.driverId!,
                        trip.code,
                    ),
                );
                break;
            case TripStatus.IN_PROGRESS:
                this.eventEmitter.emit(
                    BookingEvent.TRIP_STARTED,
                    new TripStartedEvent(tripId, trip.driverId!, trip.code),
                );
                break;
            case TripStatus.COMPLETED:
                this.eventEmitter.emit(
                    BookingEvent.TRIP_COMPLETED,
                    new TripCompletedEvent(tripId, trip.driverId!, trip.code),
                );
                break;
        }

        return updatedTripWithCount;
    }

    /**
     * Open boarding for a trip (driver action)
     */
    async openBoarding(tripId: string, driverId: string) {
        return this.updateTripStatus(tripId, TripStatus.BOARDING, driverId);
    }

    /**
     * Update stop status
     */
    async updateStopStatus(tripId: string, stopId: string, status: StopStatus) {
        this.logger.log(
            `Updating stop ${stopId} status to ${status} for trip ${tripId}`,
        );

        const trip = await this.db.trip.findUnique({
            where: { id: tripId },
        });

        if (!trip) {
            throw new TripNotFoundException(tripId);
        }

        if (trip.status !== TripStatus.IN_PROGRESS) {
            throw new InvalidTripStateException(
                `Cannot update stop status when trip is not in progress`,
            );
        }

        // Fetch current stop status
        const currentStopStatus = await this.db.tripStopStatus.findUnique({
            where: {
                tripId_stopId: {
                    tripId,
                    stopId,
                },
            },
        });

        if (!currentStopStatus) {
            throw new InvalidTripStateException(
                `Stop ${stopId} not found for trip ${tripId}`,
            );
        }

        // Validate stop status transition
        const allowedStopTransitions =
            this.validStopTransitions[currentStopStatus.status];
        if (!allowedStopTransitions.includes(status)) {
            throw new InvalidTripTransitionException(
                currentStopStatus.status,
                status,
            );
        }

        const now = new Date();
        const updateData: Partial<TripStopStatus> = { status };

        // Set timestamps based on status
        if (status === StopStatus.ARRIVED) {
            updateData.actualArrival = now;
        } else if (status === StopStatus.DEPARTED) {
            updateData.actualDeparture = now;
        }

        const updatedStopStatus = await this.db.tripStopStatus.update({
            where: {
                tripId_stopId: {
                    tripId,
                    stopId,
                },
            },
            data: updateData,
        });

        this.eventEmitter.emit(
            'stop.status.updated',
            new StopStatusUpdatedEvent(
                tripId,
                stopId,
                status,
                updatedStopStatus.actualArrival ?? undefined,
                updatedStopStatus.actualDeparture ?? undefined,
            ),
        );

        return updatedStopStatus;
    }

    /**
     * Process passenger boarding or alighting (driver scans QR code)
     */
    private async processPassengerAction(
        driverId: string,
        boardingToken: string,
        action: 'board' | 'alight',
    ) {
        this.logger.log(
            `Driver ${driverId} ${action === 'board' ? 'boarding' : 'alighting'} passenger`,
        );

        // Decode token to get trip ID (without full validation yet)
        const decoded =
            this.passengerService.decodeBoardingToken(boardingToken);

        if (!decoded) {
            throw new InvalidBoardingTokenException();
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

        // Now validate the token fully (signature, expiration, trip match)
        const payload = this.passengerService.validateBoardingToken(
            boardingToken,
            trip.id,
        );

        // Load passenger trip
        const passengerTrip = await this.db.passengerTrip.findUnique({
            where: {
                passengerId_tripId: {
                    passengerId: payload.sub,
                    tripId: payload.tripId,
                },
            },
            include: {
                passenger: true,
            },
        });

        if (!passengerTrip) {
            throw new InvalidBoardingTokenException('Passenger trip not found');
        }

        // Idempotency check based on action
        if (action === 'board' && passengerTrip.boardedAt) {
            this.logger.log(
                `Passenger ${passengerTrip.passengerId} already boarded at ${passengerTrip.boardedAt.toISOString()}`,
            );
            return {
                success: true,
                alreadyBoarded: true,
                alreadyAlighted: false,
                passengerTrip,
            };
        }

        if (action === 'alight' && passengerTrip.alightedAt) {
            this.logger.log(
                `Passenger ${passengerTrip.passengerId} already alighted at ${passengerTrip.alightedAt.toISOString()}`,
            );
            return {
                success: true,
                alreadyBoarded: false,
                alreadyAlighted: true,
                passengerTrip,
            };
        }

        // Update passenger trip with timestamp
        const updateData =
            action === 'board'
                ? { boardedAt: new Date() }
                : { alightedAt: new Date() };

        const updatedPassengerTrip = await this.db.passengerTrip.update({
            where: { id: passengerTrip.id },
            data: updateData,
            include: {
                passenger: true,
            },
        });

        const passengerName = `${updatedPassengerTrip.passenger.firstName} ${updatedPassengerTrip.passenger.lastName}`;

        // Emit appropriate event
        if (action === 'board') {
            this.eventEmitter.emit(
                'passenger.boarded',
                new PassengerBoardedEvent(
                    updatedPassengerTrip.id,
                    updatedPassengerTrip.passengerId,
                    trip.id,
                    passengerName,
                    updatedPassengerTrip.boardedAt!,
                ),
            );
        } else {
            this.eventEmitter.emit(
                'passenger.alighted',
                new PassengerAlightedEvent(
                    updatedPassengerTrip.id,
                    updatedPassengerTrip.passengerId,
                    trip.id,
                    passengerName,
                    updatedPassengerTrip.alightedAt!,
                ),
            );
        }

        return {
            success: true,
            alreadyBoarded: false,
            alreadyAlighted: false,
            passengerTrip: updatedPassengerTrip,
        };
    }

    /**
     * Board a passenger (driver scans QR code)
     */
    async boardPassenger(driverId: string, boardingToken: string) {
        return this.processPassengerAction(driverId, boardingToken, 'board');
    }

    /**
     * Alight a passenger (driver action)
     */
    async alightPassenger(driverId: string, boardingToken: string) {
        return this.processPassengerAction(driverId, boardingToken, 'alight');
    }

    /**
     * Get trip execution details
     */
    async getTripExecutionDetails(tripId: string) {
        const trip = await this.db.trip.findUnique({
            where: { id: tripId },
            include: {
                route: {
                    include: {
                        startLocation: true,
                        endLocation: true,
                        routeStops: {
                            include: {
                                stop: true,
                            },
                            orderBy: {
                                sequence: 'asc',
                            },
                        },
                    },
                },
                vehicle: true,
                driver: true,
                tripStopStatuses: {
                    include: {
                        stop: true,
                    },
                    orderBy: {
                        sequence: 'asc',
                    },
                },
                passengerTrips: {
                    include: {
                        passenger: true,
                    },
                },
            },
        });

        if (!trip) {
            throw new TripNotFoundException(tripId);
        }

        return trip;
    }
}
