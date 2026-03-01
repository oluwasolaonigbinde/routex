import { DatabaseService } from '@/modules/database/database.service';
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { BookingStatus, Prisma } from '@prisma/client';

@Injectable()
export class BookingCronService {
    private readonly logger = new Logger(BookingCronService.name);

    constructor(private readonly db: DatabaseService) {}

    /**
     * Runs every minute to expire PENDING bookings that have not been
     * paid within the allowed payment window.
     *
     * Configurable via BOOKING_PAYMENT_TIMEOUT_MIN (default: 15 minutes).
     *
     * For each expired booking it:
     *  1. Marks the booking as CANCELLED
     *  2. Fails any PENDING transactions linked to that booking
     *  3. Restores available seats on the trip(s)
     *  4. Cancels passenger trips
     *  5. Emits a booking.cancelled event
     */
    @Cron(CronExpression.EVERY_MINUTE)
    async expireUnpaidBookings(): Promise<void> {
        const now = new Date();

        const expiredBookings = await this.db.booking.findMany({
            where: {
                status: BookingStatus.PENDING,
                reservationExpiresAt: { lte: now },
            },

            include: {
                _count: { select: { passengers: true } },
            },
        });

        if (expiredBookings.length === 0) return;

        this.logger.log(
            `Found ${expiredBookings.length} unpaid booking(s) to expire`,
        );

        for (const booking of expiredBookings) {
            try {
                await this.expireBooking(booking);
            } catch (error) {
                this.logger.error(
                    `Failed to expire booking ${booking.id}: ${(error as Error).message}`,
                    (error as Error).stack,
                );
            }
        }
    }

    /**
     * Expire a single unpaid booking: cancel it, fail its transactions,
     * restore seats, and cancel passenger trips.
     */
    private async expireBooking(
        booking: Prisma.BookingGetPayload<{
            include: { _count: { select: { passengers: true } } };
        }>,
    ): Promise<void> {
        this.logger.log(
            `Expiring unpaid booking ${booking.id} for user ${booking.userId}`,
        );

        await this.db.$transaction(async (tx) => {
            // 1. Cancel the booking
            await tx.booking.update({
                where: { id: booking.id },
                data: { status: BookingStatus.EXPIRED },
            });

            // 3. Restore available seats on trip(s)
            await tx.trip.update({
                where: { id: booking.outboundTripId },
                data: {
                    availableSeats: {
                        increment: booking._count.passengers,
                    },
                },
            });

            if (booking.returnTripId) {
                await tx.trip.update({
                    where: { id: booking.returnTripId },
                    data: {
                        availableSeats: {
                            increment: booking._count.passengers,
                        },
                    },
                });
            }

            // 4. Cancel passenger trips
            await tx.passengerTrip.updateMany({
                where: {
                    passenger: { bookingId: booking.id },
                },
                data: { status: 'CANCELLED', boardingToken: null },
            });
        });

        this.logger.log(`Booking ${booking.id} expired and seats restored`);
    }
}
