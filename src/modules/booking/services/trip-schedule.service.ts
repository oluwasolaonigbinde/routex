import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { DatabaseService } from '@/modules/database/database.service';
import { RecurrencePattern, TripStatus, Prisma } from '@prisma/client';
import {
    CreateTripScheduleDto,
    SearchSchedulesDto,
    UpdateTripScheduleDto,
} from '@/modules/booking/dto/trip.dto';
import {
    RouteNotFoundException,
    VehicleNotFoundException,
} from '@/modules/booking/exceptions/booking.exception';
import { TripScheduleCreatedEvent } from '@/modules/booking/events/trip.events';
import { TripScheduleNotFoundException } from '@/modules/booking/exceptions/trip.exception';

@Injectable()
export class TripScheduleService {
    private readonly logger = new Logger(TripScheduleService.name);

    constructor(
        private readonly db: DatabaseService,
        private readonly eventEmitter: EventEmitter2,
    ) {}

    /**
     * Create a trip schedule
     */
    async createTripSchedule(dto: CreateTripScheduleDto) {
        this.logger.log(`Creating trip schedule for route ${dto.routeId}`);

        // Validate route exists
        const route = await this.db.route.findUnique({
            where: { id: dto.routeId },
        });
        if (!route) {
            throw new RouteNotFoundException(dto.routeId);
        }

        // Validate vehicle exists
        const vehicle = await this.db.vehicle.findUnique({
            where: { id: dto.vehicleId },
        });
        if (!vehicle) {
            throw new VehicleNotFoundException(dto.vehicleId);
        }

        const schedule = await this.db.tripSchedule.create({
            data: dto,
            include: {
                route: true,
                vehicle: true,
            },
        });

        // generate trips in advance
        const endDate = schedule.endDate || this.getDefaultEndDate();
        await this.generateTripsForSchedule(
            schedule.id,
            schedule.startDate,
            endDate,
        );

        this.eventEmitter.emit(
            'trip-schedule.created',
            new TripScheduleCreatedEvent(schedule.id, dto.routeId),
        );

        return schedule;
    }

    /**
     * Update a trip schedule
     */
    async updateTripSchedule(scheduleId: string, dto: UpdateTripScheduleDto) {
        const schedule = await this.db.tripSchedule.findUnique({
            where: { id: scheduleId },
        });

        if (!schedule) {
            throw new TripScheduleNotFoundException(scheduleId);
        }

        return this.db.tripSchedule.update({
            where: { id: scheduleId },
            data: dto,
        });
    }

    /**
     * Generate trips for a schedule within a date range
     */
    // TODO: A cron job should hadnle this (maybe generate 7 days in advance)
    async generateTripsForSchedule(
        scheduleId: string,
        startDate: Date,
        endDate: Date,
    ): Promise<number> {
        this.logger.log(
            `Generating trips for schedule ${scheduleId} from ${startDate.toISOString()} to ${endDate.toISOString()}`,
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

        const serviceDates = this.calculateServiceDates(
            startDate,
            endDate,
            schedule.recurrence,
            schedule.daysOfWeek,
        );

        let createdCount = 0;

        for (const serviceDate of serviceDates) {
            try {
                const departureDateTime = this.combineDateAndTime(
                    serviceDate,
                    schedule.departureTime,
                );

                const tripCode = this.generateTripCode(
                    schedule.route.code,
                    serviceDate,
                    schedule.departureTime,
                );

                await this.db.trip.upsert({
                    where: {
                        tripScheduleId_tripScheduleDate: {
                            tripScheduleId: schedule.id,
                            tripScheduleDate: serviceDate,
                        },
                    },
                    create: {
                        code: tripCode,
                        routeId: schedule.routeId,
                        vehicleId: schedule.vehicleId,
                        departureTime: departureDateTime,
                        availableSeats: schedule.vehicle.totalSeats,
                        status: TripStatus.SCHEDULED,
                        tripScheduleId: schedule.id,
                        tripScheduleDate: serviceDate,
                    },
                    update: {}, // Do nothing if already exists (idempotent)
                });

                createdCount++;
            } catch (error) {
                this.logger.warn(
                    `Failed to create trip for ${serviceDate.toISOString()}: ${error.message}`,
                );
            }
        }

        this.logger.log(
            `Created/verified ${createdCount} trips for schedule ${scheduleId}`,
        );

        return createdCount;
    }

    /**
     * Get schedule by ID
     */
    async getScheduleById(scheduleId: string) {
        const schedule = await this.db.tripSchedule.findUnique({
            where: { id: scheduleId },
            include: {
                route: {
                    include: {
                        startLocation: true,
                        endLocation: true,
                    },
                },
                vehicle: true,
            },
        });

        if (!schedule) {
            throw new TripScheduleNotFoundException(scheduleId);
        }

        return schedule;
    }

    /**
     * List schedules with filters
     */
    async listSchedules(filters?: { routeId?: string; isActive?: boolean }) {
        return this.db.tripSchedule.findMany({
            where: {
                ...(filters?.routeId && { routeId: filters.routeId }),
                ...(filters?.isActive !== undefined && {
                    isActive: filters.isActive,
                }),
            },
            include: {
                route: {
                    include: {
                        startLocation: true,
                        endLocation: true,
                    },
                },
                vehicle: true,
            },
            orderBy: { startDate: 'asc' },
        });
    }

    /**
     * Search schedules with location, route, and date filters
     */
    async searchSchedules(dto: SearchSchedulesDto) {
        const { page, limit } = dto;
        const skip = (page - 1) * limit;

        const where: Prisma.TripScheduleWhereInput = {
            isActive: true,
            ...(dto.startLocationId && {
                route: {
                    startLocationId: dto.startLocationId,
                    ...(dto.endLocationId && {
                        endLocationId: dto.endLocationId,
                    }),
                },
            }),
            ...(!dto.startLocationId &&
                dto.endLocationId && {
                    route: {
                        endLocationId: dto.endLocationId,
                    },
                }),
        };

        // If a specific date is provided, filter by date range and daysOfWeek
        if (dto.date) {
            const targetDate = new Date(dto.date);
            targetDate.setUTCHours(0, 0, 0, 0);
            const dayOfWeek = targetDate.getDay();

            where.startDate = { lte: targetDate };
            where.OR = [{ endDate: null }, { endDate: { gte: targetDate } }];
            where.daysOfWeek = { has: dayOfWeek };
        }

        const [schedules, totalCount] = await Promise.all([
            this.db.tripSchedule.findMany({
                where,
                include: {
                    route: {
                        include: {
                            startLocation: true,
                            endLocation: true,
                        },
                    },
                    vehicle: true,
                },
                orderBy: { departureTime: 'asc' },
                skip,
                take: limit,
            }),
            this.db.tripSchedule.count({ where }),
        ]);

        return {
            totalCount,
            page,
            limit,
            results: schedules,
            perPage: schedules.length,
        };
    }

    /**
     * Calculate service dates based on recurrence pattern
     */
    private calculateServiceDates(
        startDate: Date,
        endDate: Date,
        recurrence: RecurrencePattern,
        daysOfWeek: number[],
    ): Date[] {
        const dates: Date[] = [];
        const current = new Date(startDate);
        current.setUTCHours(0, 0, 0, 0);

        const end = new Date(endDate);
        end.setUTCHours(23, 59, 59, 999);

        while (current <= end) {
            if (recurrence === RecurrencePattern.DAILY) {
                // For daily, check if current day is in daysOfWeek
                const dayOfWeek = current.getDay();
                if (daysOfWeek.includes(dayOfWeek)) {
                    dates.push(new Date(current));
                }
                current.setDate(current.getDate() + 1);
            } else if (recurrence === RecurrencePattern.WEEKLY) {
                // For weekly, check if current day is in daysOfWeek
                const dayOfWeek = current.getDay();
                if (daysOfWeek.includes(dayOfWeek)) {
                    dates.push(new Date(current));
                }
                current.setDate(current.getDate() + 1);
            }
        }

        return dates;
    }

    /**
     * Combine date and time string (HH:mm)
     */
    private combineDateAndTime(date: Date, timeString: string): Date {
        const [hours, minutes] = timeString.split(':').map(Number);
        const result = new Date(date);
        result.setUTCHours(hours, minutes, 0, 0);
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

    /**
     * Get default end date (7 days from now)
     */
    private getDefaultEndDate(): Date {
        const date = new Date();
        date.setDate(date.getDate() + 7);
        return date;
    }
}
