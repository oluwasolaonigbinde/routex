import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DatabaseService } from '@/modules/database/database.service';
import {
    TripStatus,
    Trip,
    TripSchedule,
    RecurrencePattern,
    StopStatus,
    Prisma,
} from '@prisma/client';
import { ScheduleNotAvailableForDateException } from '@/modules/booking/exceptions/booking.exception';
import { CreateAdHocTripDto } from '@/modules/booking/dto/trip.dto';
import { TripWithStopsInclude } from '@/modules/booking/types';
import {
    TripNotBookableException,
    TripScheduleNotFoundException,
} from '@/modules/booking/exceptions/trip.exception';
import { TripEntity } from '@/modules/booking/entities/trip.entity';

@Injectable()
export class TripCreationService {
    private readonly logger = new Logger(TripCreationService.name);

    constructor(
        private readonly db: DatabaseService,
        private readonly configService: ConfigService,
    ) {}

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
                startLocationId: schedule.route.startLocationId,
                endLocationId: schedule.route.endLocationId,
                vehicleId: schedule.vehicleId,
                departureTime: departureDateTime,
                boardingOpensAt: this.getBoardingOpensAt(departureDateTime),
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
            include: TripWithStopsInclude,
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
    async createAdHocTrip(dto: CreateAdHocTripDto): Promise<TripEntity> {
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
                startLocationId: route.startLocationId,
                endLocationId: route.endLocationId,
                driverId: dto.driverId,
                departureTime: dto.departureDate,
                boardingOpensAt: this.getBoardingOpensAt(dto.departureDate),
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

        return { ...trip, numStops: trip.tripStopStatuses.length };
    }

    /**
     * Compute the boarding-opens-at timestamp based on config.
     */
    private getBoardingOpensAt(departureTime: Date): Date {
        const beforeMin =
            this.configService.get<number>('TRIP_START_WINDOW_BEFORE_MIN') ??
            30;
        return new Date(departureTime.getTime() - beforeMin * 60 * 1000);
    }
}
