import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { DatabaseService } from '@/modules/database/database.service';
import { TripStatus, StopStatus } from '@prisma/client';
import {
    TripNotFoundException,
    InvalidTripTransitionException,
    DriverNotAssignedException,
} from '../exceptions/booking.exception';
import {
    DriverAssignedEvent,
    TripBoardingOpenEvent,
    TripStartedEvent,
    TripCompletedEvent,
} from '../events/booking.events';

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

    constructor(
        private readonly db: DatabaseService,
        private readonly eventEmitter: EventEmitter2,
    ) {}

    /**
     * Assign a driver to a trip
     */
    async assignDriver(tripId: string, driverId: string) {
        this.logger.log(`Assigning driver ${driverId} to trip ${tripId}`);

        // Verify driver exists and has DRIVER tenant
        const driver = await this.db.driver.findUnique({
            where: { id: driverId },
        });

        if (!driver || driver.tenant !== 'DRIVER') {
            throw new Error('Invalid driver or driver not found');
        }

        const trip = await this.db.trip.update({
            where: { id: tripId },
            data: { driverId },
            include: {
                route: true,
                vehicle: true,
                driver: true,
            },
        });

        this.eventEmitter.emit(
            'trip.driver-assigned',
            new DriverAssignedEvent(tripId, driverId, trip.code),
        );

        return trip;
    }

    /**
     * Update trip status with state machine validation
     */
    async updateTripStatus(
        tripId: string,
        newStatus: TripStatus,
        driverId?: string,
    ) {
        this.logger.log(`Updating trip ${tripId} status to ${newStatus}`);

        const trip = await this.db.trip.findUnique({
            where: { id: tripId },
        });

        if (!trip) {
            throw new TripNotFoundException(tripId);
        }

        // Validate transition
        const allowedTransitions = this.validTransitions[trip.status];
        if (!allowedTransitions.includes(newStatus)) {
            throw new InvalidTripTransitionException(trip.status, newStatus);
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

        const updatedTrip = await this.db.trip.update({
            where: { id: tripId },
            data: { status: newStatus },
            include: {
                route: true,
                vehicle: true,
                driver: true,
            },
        });

        // Emit appropriate events
        switch (newStatus) {
            case TripStatus.BOARDING:
                this.eventEmitter.emit(
                    'trip.boarding-open',
                    new TripBoardingOpenEvent(
                        tripId,
                        trip.driverId!,
                        trip.code,
                    ),
                );
                break;
            case TripStatus.IN_PROGRESS:
                this.eventEmitter.emit(
                    'trip.started',
                    new TripStartedEvent(tripId, trip.driverId!, trip.code),
                );
                break;
            case TripStatus.COMPLETED:
                this.eventEmitter.emit(
                    'trip.completed',
                    new TripCompletedEvent(tripId, trip.driverId!, trip.code),
                );
                break;
        }

        return updatedTrip;
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

        // Find or create TripStopStatus
        const existing = await this.db.tripStopStatus.findUnique({
            where: {
                tripId_stopId: {
                    tripId,
                    stopId,
                },
            },
        });

        const now = new Date();
        const updateData: any = { status };

        // Set timestamps based on status
        if (status === StopStatus.ARRIVED) {
            updateData.actualArrival = now;
        } else if (status === StopStatus.DEPARTED) {
            updateData.actualDeparture = now;
        }

        if (existing) {
            return this.db.tripStopStatus.update({
                where: {
                    tripId_stopId: {
                        tripId,
                        stopId,
                    },
                },
                data: updateData,
            });
        } else {
            // Get sequence from route stop
            const routeStop = await this.db.routeStop.findFirst({
                where: {
                    stopId,
                },
            });

            return this.db.tripStopStatus.create({
                data: {
                    tripId,
                    stopId,
                    sequence: routeStop?.sequence || 0,
                    ...updateData,
                },
            });
        }
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
