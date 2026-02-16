import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { NotificationService } from '../services/notification.service';
import { NotificationType } from '../event/enum';
import {
    BookingCreatedEvent,
    BookingConfirmedEvent,
    BookingCancelledEvent,
} from '@/modules/booking/events/booking.events';
import {
    PassengerBoardedEvent,
    TripBoardingOpenEvent,
    TripStartedEvent,
    TripCompletedEvent,
} from '@/modules/booking/events/trip.events';
import { DatabaseService } from '@/modules/database/database.service';

@Injectable()
export class BookingNotificationListener {
    private readonly logger = new Logger(BookingNotificationListener.name);

    constructor(
        private readonly notificationService: NotificationService,
        private readonly db: DatabaseService,
    ) {}

    @OnEvent('booking.created', { async: true })
    async handleBookingCreated(event: BookingCreatedEvent) {
        this.logger.log(
            `Handling booking.created event for booking ${event.bookingId}`,
        );

        await this.notificationService.sendInAppNotification({
            userId: event.userId,
            type: NotificationType.BOOKING_CREATED,
            title: 'Booking Created',
            message: `Your booking has been created. Please complete payment to confirm.`,
            tenant: 'USER',
            metadata: {
                bookingId: event.bookingId,
            },
        });
    }

    @OnEvent('booking.confirmed', { async: true })
    async handleBookingConfirmed(event: BookingConfirmedEvent) {
        this.logger.log(
            `Handling booking.confirmed event for booking ${event.bookingId}`,
        );

        // Get booking details with passengers and trips
        const booking = await this.db.booking.findUnique({
            where: { id: event.bookingId },
            include: {
                passengers: {
                    include: {
                        passengerTrips: true,
                    },
                },
                outboundTrip: {
                    include: {
                        route: {
                            include: {
                                startLocation: true,
                                endLocation: true,
                            },
                        },
                    },
                },
                returnTrip: {
                    include: {
                        route: {
                            include: {
                                startLocation: true,
                                endLocation: true,
                            },
                        },
                    },
                },
            },
        });

        await this.notificationService.sendInAppNotification({
            userId: event.userId,
            type: NotificationType.BOOKING_CONFIRMED,
            title: 'Booking Confirmed',
            message: `Your booking has been confirmed. Trip departing on ${booking?.outboundTrip.departureTime.toLocaleDateString()}.`,
            tenant: 'USER',
            metadata: {
                bookingId: event.bookingId,
            },
        });

        // TODO: Send email with boarding passes/QR codes
        this.logger.log(
            `Email with boarding passes should be sent for booking ${event.bookingId}`,
        );
    }

    @OnEvent('booking.cancelled', { async: true })
    async handleBookingCancelled(event: BookingCancelledEvent) {
        this.logger.log(
            `Handling booking.cancelled event for booking ${event.bookingId}`,
        );

        await this.notificationService.sendInAppNotification({
            userId: event.userId,
            type: NotificationType.BOOKING_CANCELLED,
            title: 'Booking Cancelled',
            message: `Your booking has been cancelled. ${event.reason || ''}`,
            tenant: 'USER',
            metadata: {
                bookingId: event.bookingId,
            },
        });
    }

    @OnEvent('trip.boarding-open', { async: true })
    async handleTripBoardingOpen(event: TripBoardingOpenEvent) {
        this.logger.log(
            `Handling trip.boarding-open event for trip ${event.tripId}`,
        );

        // Get all passengers for this trip
        const passengerTrips = await this.db.passengerTrip.findMany({
            where: { tripId: event.tripId },
            include: {
                passenger: {
                    include: {
                        booking: {
                            select: {
                                userId: true,
                            },
                        },
                    },
                },
            },
        });

        // Notify each passenger
        const notificationPromises = passengerTrips.map(async (pt) => {
            return this.notificationService.sendInAppNotification({
                userId: pt.passenger.booking.userId,
                type: NotificationType.TRIP_BOARDING_OPEN,
                title: 'Boarding Now Open',
                message: `Boarding is now open for trip ${event.tripCode}. Please proceed to the boarding area.`,
                tenant: 'USER',
                metadata: {
                    tripId: event.tripId,
                    passengerTripId: pt.id,
                },
            });
        });

        await Promise.all(notificationPromises);
    }

    @OnEvent('passenger.boarded', { async: true })
    async handlePassengerBoarded(event: PassengerBoardedEvent) {
        this.logger.log(
            `Handling passenger.boarded event for passenger trip ${event.passengerTripId}`,
        );

        // Get user ID from passenger
        const passengerTrip = await this.db.passengerTrip.findUnique({
            where: { id: event.passengerTripId },
            include: {
                passenger: {
                    include: {
                        booking: {
                            select: {
                                userId: true,
                            },
                        },
                    },
                },
            },
        });

        await this.notificationService.sendInAppNotification({
            userId: passengerTrip!.passenger.booking.userId,
            type: NotificationType.PASSENGER_BOARDED,
            title: 'Boarding Confirmed',
            message: `${event.passengerName} has successfully boarded the trip.`,
            tenant: 'USER',
            metadata: {
                passengerTripId: event.passengerTripId,
                tripId: event.tripId,
            },
        });
    }

    @OnEvent('trip.started', { async: true })
    async handleTripStarted(event: TripStartedEvent) {
        this.logger.log(`Handling trip.started event for trip ${event.tripId}`);

        // Get all passengers for this trip
        const passengerTrips = await this.db.passengerTrip.findMany({
            where: { tripId: event.tripId },
            include: {
                passenger: {
                    include: {
                        booking: {
                            select: {
                                userId: true,
                            },
                        },
                    },
                },
            },
        });

        // Notify each passenger
        const notificationPromises = passengerTrips.map(async (pt) => {
            return this.notificationService.sendInAppNotification({
                userId: pt.passenger.booking.userId,
                type: NotificationType.TRIP_STARTED,
                title: 'Trip Started',
                message: `Your trip ${event.tripCode} has started.`,
                tenant: 'USER',
                metadata: {
                    tripId: event.tripId,
                },
            });
        });

        await Promise.all(notificationPromises);
    }

    @OnEvent('trip.completed', { async: true })
    async handleTripCompleted(event: TripCompletedEvent) {
        this.logger.log(
            `Handling trip.completed event for trip ${event.tripId}`,
        );

        // Get all passengers for this trip
        const passengerTrips = await this.db.passengerTrip.findMany({
            where: { tripId: event.tripId },
            include: {
                passenger: {
                    include: {
                        booking: {
                            select: {
                                userId: true,
                            },
                        },
                    },
                },
            },
        });

        // Notify each passenger
        const notificationPromises = passengerTrips.map(async (pt) => {
            return this.notificationService.sendInAppNotification({
                userId: pt.passenger.booking.userId,
                type: NotificationType.TRIP_COMPLETED,
                title: 'Trip Completed',
                message: `Your trip ${event.tripCode} has been completed. Thank you for traveling with us!`,
                tenant: 'USER',
                metadata: {
                    tripId: event.tripId,
                },
            });
        });

        await Promise.all(notificationPromises);
    }
}
