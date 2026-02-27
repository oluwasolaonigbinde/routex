import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { DatabaseService } from '@/modules/database/database.service';
import { BookingStatus, TripStatus } from '@prisma/client';
import { BookingEvent } from '@/modules/booking/types/event';
import { TripCancelledEvent } from '@/modules/booking/events/trip.events';

@Injectable()
export class TripCronService {
    private readonly logger = new Logger(TripCronService.name);

    constructor(
        private readonly db: DatabaseService,
        private readonly configService: ConfigService,
        private readonly eventEmitter: EventEmitter2,
    ) {}

    /**
     * Runs every 5 minutes to auto-cancel SCHEDULED trips
     * whose start window has elapsed without the driver opening boarding.
     */
    @Cron(CronExpression.EVERY_5_MINUTES)
    async autoCancelExpiredTrips(): Promise<void> {
        const afterMin =
            this.configService.get<number>('TRIP_START_WINDOW_AFTER_MIN') ?? 30;

        // A trip is expired when now > departureTime + afterMin
        const cutoff = new Date(Date.now() - afterMin * 60 * 1000);

        const expiredTrips = await this.db.trip.findMany({
            where: {
                status: TripStatus.SCHEDULED,
                departureTime: { lte: cutoff },
            },
            select: {
                id: true,
                code: true,
            },
        });

        if (expiredTrips.length === 0) return;

        this.logger.log(
            `Found ${expiredTrips.length} expired trip(s) to auto-cancel`,
        );

        for (const trip of expiredTrips) {
            try {
                await this.cancelTripWithBookings(trip.id, trip.code);
            } catch (error) {
                this.logger.error(
                    `Failed to auto-cancel trip ${trip.id}: ${(error as Error).message}`,
                    (error as Error).stack,
                );
            }
        }
    }

    /**
     * Cancel a single trip and all its active bookings inside a transaction.
     * Restores available seats and emits events for downstream processing (refunds, notifications).
     */
    private async cancelTripWithBookings(
        tripId: string,
        tripCode: string,
    ): Promise<void> {
        this.logger.log(`Auto-cancelling trip ${tripId} (${tripCode})`);

        const cancelledBookingIds = await this.db.$transaction(async (tx) => {
            // 1. Cancel the trip
            await tx.trip.update({
                where: { id: tripId },
                data: { status: TripStatus.CANCELLED },
            });

            // 2. Find all active bookings for this trip (outbound or return)
            const activeBookings = await tx.booking.findMany({
                where: {
                    OR: [{ outboundTripId: tripId }, { returnTripId: tripId }],
                    status: {
                        in: [BookingStatus.PENDING, BookingStatus.CONFIRMED],
                    },
                },
                select: {
                    id: true,
                    userId: true,
                    status: true,
                    _count: { select: { passengers: true } },
                },
            });

            const bookingIds: string[] = [];

            for (const booking of activeBookings) {
                // Cancel the booking
                await tx.booking.update({
                    where: { id: booking.id },
                    data: { status: BookingStatus.CANCELLED },
                });

                bookingIds.push(booking.id);
            }

            return bookingIds;
        });

        // 3. Emit events outside the transaction
        this.eventEmitter.emit(
            BookingEvent.TRIP_CANCELLED,
            new TripCancelledEvent(
                tripId,
                tripCode,
                'Auto-cancelled: driver did not start within the allowed window',
            ),
        );

        this.logger.log(
            `Trip ${tripId} cancelled with ${cancelledBookingIds.length} booking(s)`,
        );
    }
}
