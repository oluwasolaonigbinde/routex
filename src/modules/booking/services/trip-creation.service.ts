import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '@/modules/database/database.service';
import { TripScheduleNotFoundException } from '../exceptions/booking.exception';
import { TripStatus } from '@prisma/client';

@Injectable()
export class TripCreationService {
    private readonly logger = new Logger(TripCreationService.name);

    constructor(private readonly db: DatabaseService) {}

    /**
     * Get or create a trip for a schedule on a specific service date
     * Implements lazy trip creation with concurrency safety
     */
    async getOrCreateTripForSchedule(
        scheduleId: string,
        serviceDate: Date,
    ): Promise<any> {
        this.logger.log(
            `Getting or creating trip for schedule ${scheduleId} on ${serviceDate}`,
        );

        const schedule = await this.db.tripSchedule.findUnique({
            where: { id: scheduleId },
            include: {
                route: true,
                vehicle: true,
            },
        });

        if (!schedule) {
            throw new TripScheduleNotFoundException(scheduleId);
        }

        // Normalize service date (remove time component)
        const normalizedDate = new Date(serviceDate);
        normalizedDate.setHours(0, 0, 0, 0);

        // Try to find existing trip first
        let trip = await this.db.trip.findUnique({
            where: {
                tripScheduleId_tripScheduleDate: {
                    tripScheduleId: scheduleId,
                    tripScheduleDate: normalizedDate,
                },
            },
            include: {
                route: true,
                vehicle: true,
            },
        });

        if (trip) {
            this.logger.log(`Trip already exists: ${trip.id}`);
            return trip;
        }

        // Trip doesn't exist, create it with retry logic for concurrency
        const maxRetries = 3;
        let retryCount = 0;

        while (retryCount < maxRetries) {
            try {
                const departureDateTime = this.combineDateAndTime(
                    normalizedDate,
                    schedule.departureTime,
                );

                const tripCode = this.generateTripCode(
                    schedule.route.code,
                    normalizedDate,
                    schedule.departureTime,
                );

                trip = await this.db.trip.create({
                    data: {
                        code: tripCode,
                        routeId: schedule.routeId,
                        vehicleId: schedule.vehicleId,
                        departureTime: departureDateTime,
                        availableSeats: schedule.vehicle.totalSeats,
                        status: TripStatus.SCHEDULED,
                        tripScheduleId: schedule.id,
                        tripScheduleDate: normalizedDate,
                    },
                    include: {
                        route: true,
                        vehicle: true,
                    },
                });

                this.logger.log(`Created new trip: ${trip.id}`);
                return trip;
            } catch (error) {
                // Check if it's a unique constraint violation (P2002)
                if (error.code === 'P2002') {
                    retryCount++;
                    const backoffMs = 100 * retryCount;

                    this.logger.warn(
                        `Unique constraint violation detected. Retry ${retryCount}/${maxRetries} after ${backoffMs}ms`,
                    );

                    // Wait with exponential backoff
                    await new Promise((resolve) =>
                        setTimeout(resolve, backoffMs),
                    );

                    // Try to find the trip that another process created
                    trip = await this.db.trip.findUnique({
                        where: {
                            tripScheduleId_tripScheduleDate: {
                                tripScheduleId: scheduleId,
                                tripScheduleDate: normalizedDate,
                            },
                        },
                        include: {
                            route: true,
                            vehicle: true,
                        },
                    });

                    if (trip) {
                        this.logger.log(
                            `Found trip created by concurrent process: ${trip.id}`,
                        );
                        return trip;
                    }

                    // Continue to retry if trip still not found
                    continue;
                }

                // Other errors should be thrown immediately
                throw error;
            }
        }

        // Final attempt to find the trip
        trip = await this.db.trip.findUnique({
            where: {
                tripScheduleId_tripScheduleDate: {
                    tripScheduleId: scheduleId,
                    tripScheduleDate: normalizedDate,
                },
            },
            include: {
                route: true,
                vehicle: true,
            },
        });

        if (!trip) {
            throw new Error(
                'Failed to create or find trip after multiple retries',
            );
        }

        return trip;
    }

    /**
     * Combine date and time string (HH:mm)
     */
    private combineDateAndTime(date: Date, timeString: string): Date {
        const [hours, minutes] = timeString.split(':').map(Number);
        const result = new Date(date);
        result.setHours(hours, minutes, 0, 0);
        return result;
    }

    /**
     * Generate trip code
     */
    private generateTripCode(
        routeCode: string,
        date: Date,
        time: string,
    ): string {
        const dateStr = date.toISOString().split('T')[0].replace(/-/g, '');
        const timeStr = time.replace(':', '');
        return `${routeCode}-${dateStr}-${timeStr}`;
    }
}
