import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '@/modules/database/database.service';
import {
    TripScheduleNotFoundException,
    ScheduleNotAvailableForDateException,
    TripNotBookableException,
} from '../exceptions/booking.exception';
import {
    TripStatus,
    Trip,
    TripSchedule,
    RecurrencePattern,
    StopStatus,
    Prisma,
} from '@prisma/client';
import { CreateAdHocTripDto } from '../dto/trip.dto';
import { TripWithRouteBasicInclude, TripWithStopsInclude } from '../types';

@Injectable()
export class TripCreationService {
    private readonly logger = new Logger(TripCreationService.name);

    constructor(private readonly db: DatabaseService) {}

    /**
     * Get or create a trip for a schedule on a specific service date
     * Implements lazy trip creation
     */
    async getOrCreateTripForSchedule(
        scheduleId: string,
        departureDate: Date,
    ): Promise<Trip> {
        this.logger.log(
            `Getting or creating trip for schedule ${scheduleId} on ${departureDate.toISOString()}`,
        );

        const schedule = await this.db.tripSchedule.findUnique({
            where: { id: scheduleId },
            include: {
                route: {
                    include: {
                        routeStops: {
                            orderBy: { sequence: 'asc' },
                        },
                    },
                },
                vehicle: true,
            },
        });

        if (!schedule) {
            throw new TripScheduleNotFoundException(scheduleId);
        }

        // Normalize departure date (remove time component)
        const normalizedDate = new Date(departureDate);
        normalizedDate.setUTCHours(0, 0, 0, 0);

        // Validate the date is valid for this schedule
        this.validateServiceDate(schedule, normalizedDate);

        const departureDateTime = this.combineDateAndTime(
            normalizedDate,
            schedule.departureTime,
        );

        if (departureDateTime < new Date()) {
            throw new TripNotBookableException(
                'Trip departure time has already passed',
            );
        }

        const tripCode = this.generateTripCode(
            schedule.route.code,
            // normalizedDate,
            // schedule.departureTime,
        );

        // Create or get existing trip for this schedule and date
        const trip = await this.db.trip.upsert({
            where: {
                tripScheduleId_tripScheduleDate: {
                    tripScheduleId: scheduleId,
                    tripScheduleDate: normalizedDate,
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
                tripScheduleDate: normalizedDate,
                tripStopStatuses: {
                    create: schedule.route.routeStops.map((routeStop) => ({
                        stopId: routeStop.stopId,
                        sequence: routeStop.sequence,
                        status: StopStatus.PENDING,
                        role: routeStop.role,
                    })),
                },
            },
            update: {},
            include: {
                route: {
                    include: {
                        startLocation: true,
                        endLocation: true,
                    },
                },
                vehicle: true,
                tripStopStatuses: {
                    include: {
                        stop: true,
                    },
                    orderBy: {
                        sequence: 'asc',
                    },
                },
            },
        });

        this.logger.log(`Trip created/resolved with trip id: ${trip.id}`);

        return trip;
    }

    /**
     * Validate that the service date is valid for the given schedule
     */
    private validateServiceDate(
        schedule: TripSchedule,
        serviceDate: Date,
    ): void {
        if (!schedule.isActive) {
            throw new ScheduleNotAvailableForDateException(
                schedule.id,
                serviceDate.toISOString().split('T')[0],
            );
        }

        const scheduleStart = schedule.startDate;
        scheduleStart.setUTCHours(0, 0, 0, 0);

        if (serviceDate < scheduleStart) {
            throw new ScheduleNotAvailableForDateException(
                schedule.id,
                serviceDate.toISOString().split('T')[0],
            );
        }

        if (schedule.endDate) {
            const scheduleEnd = new Date(schedule.endDate);
            scheduleEnd.setUTCHours(23, 59, 59, 999);

            if (serviceDate > scheduleEnd) {
                throw new ScheduleNotAvailableForDateException(
                    schedule.id,
                    serviceDate.toISOString().split('T')[0],
                );
            }
        }

        const dayOfWeek = serviceDate.getDay();
        console.log('kd', dayOfWeek);
        if (
            schedule.recurrence === RecurrencePattern.WEEKLY &&
            !schedule.daysOfWeek.includes(dayOfWeek)
        ) {
            throw new ScheduleNotAvailableForDateException(
                schedule.id,
                serviceDate.toISOString().split('T')[0],
            );
        }
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
     * Generate trip code with random suffix
     */
    private generateTripCode(
        routeCode: string,
        // date: Date,
        // time: string,
    ): string {
        // const dateStr = date.toISOString().split('T')[0].replace(/-/g, '');
        // const timeStr = time.replace(':', '');
        const randomSuffix = Math.random()
            .toString(36)
            .substring(2, 6)
            .toUpperCase();
        return `${routeCode}-${randomSuffix}`;
    }

    /**
     * Create an ad-hoc trip (not based on a schedule)
     */
    async createAdHocTrip(dto: CreateAdHocTripDto): Promise<Trip> {
        this.logger.log(`Creating ad-hoc trip for route ${dto.routeId}`);

        const [route, vehicle] = await Promise.all([
            this.db.route.findUnique({
                where: { id: dto.routeId },
                include: {
                    routeStops: {
                        orderBy: { sequence: 'asc' as Prisma.SortOrder },
                    },
                },
            }),
            this.db.vehicle.findUnique({
                where: { id: dto.vehicleId },
            }),
        ]);

        if (!route) {
            throw new TripNotBookableException('Route not found');
        }

        if (!vehicle) {
            throw new TripNotBookableException('Vehicle not found');
        }

        if (dto.departureDate < new Date()) {
            throw new TripNotBookableException(
                'Trip departure time has already passed',
            );
        }

        const normalizedDate = new Date(dto.departureDate);
        normalizedDate.setUTCHours(0, 0, 0, 0);
        // const time = dto.departureDate
        //     .toISOString()
        //     .split('T')[1]
        //     .substring(0, 5);

        const tripCode = this.generateTripCode(
            route.code,
            // normalizedDate,
            // time,
        );

        const trip = await this.db.trip.create({
            data: {
                code: tripCode,
                routeId: dto.routeId,
                vehicleId: dto.vehicleId,
                driverId: dto.driverId,
                departureTime: dto.departureDate,
                availableSeats: vehicle.totalSeats,
                priceOverride: dto.priceOverride,
                status: TripStatus.SCHEDULED,
                tripStopStatuses: {
                    create: route.routeStops.map((routeStop) => ({
                        stopId: routeStop.stopId,
                        sequence: routeStop.sequence,
                        status: StopStatus.PENDING,
                        role: routeStop.role,
                    })),
                },
            },
            include: TripWithStopsInclude,
        });

        this.logger.log(`Ad-hoc trip created with stop statuses: ${trip.id}`);

        return trip;
    }
}
