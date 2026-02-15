import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { DatabaseService } from '@/modules/database/database.service';
import {
    CreateBookingDto,
    CreateBookingFromScheduleDto,
    GetBookingsQueryDto,
} from '../dto/booking.dto';
import {
    BookingNotFoundException,
    TripNotFoundException,
    TripNotBookableException,
    InsufficientSeatsException,
    BookingCancellationNotAllowedException,
    BookingAlreadyCancelledException,
    InvalidStopException,
} from '../exceptions/booking.exception';
import { PassengerService } from './passenger.service';
import { PaymentService } from './payment.service';
import { TripCreationService } from './trip-creation.service';
import {
    BookingCreatedEvent,
    BookingConfirmedEvent,
    BookingCancelledEvent,
} from '../events/booking.events';
import {
    Prisma,
    TripStatus,
    BookingStatus,
    Trip,
    PassengerTrip,
    Booking,
    StopRole,
} from '@prisma/client';
import { nanoid } from 'nanoid';
import { PaginatedResponse } from '@/types';
import { UsersService } from '@/modules/user/users.service';
import {
    BookingWithDetailsInclude,
    BookingWithDetails,
    BookingWithPassengerTripsInclude,
} from '../types/booking.types';

@Injectable()
export class BookingService {
    private readonly logger = new Logger(BookingService.name);

    constructor(
        private readonly db: DatabaseService,
        private readonly userService: UsersService,
        private readonly passengerService: PassengerService,
        private readonly paymentService: PaymentService,
        private readonly tripCreationService: TripCreationService,
        private readonly eventEmitter: EventEmitter2,
    ) {}

    /**
     * Create a new booking with payment
     */
    async createBookingFromTrip(userId: string, dto: CreateBookingDto) {
        this.logger.log(
            `Creating booking for user ${userId}, trip ${dto.outboundTripId}`,
        );

        return this.createBooking(userId, {
            outboundTripId: dto.outboundTripId,
            returnTripId: dto.returnTripId,
            boardingStopId: dto.boardingStopId,
            alightingStopId: dto.alightingStopId,
            passengers: dto.passengers,
        });
    }

    /**
     * Create a booking from a trip schedule with lazy trip creation
     */
    async createBookingFromSchedule(
        userId: string,
        dto: CreateBookingFromScheduleDto,
    ): Promise<{ booking: Booking; paymentUrl: string }> {
        this.logger.log(
            `Creating booking from schedule ${dto.tripScheduleId} for user ${userId} on ${dto.departureDate.toISOString()}`,
        );

        // Lazily get or create the trip for the requested schedule + date
        const outboundTrip =
            await this.tripCreationService.getOrCreateTripForSchedule(
                dto.tripScheduleId,
                dto.departureDate,
            );

        // Validate the resolved trip is bookable
        if (outboundTrip.status !== TripStatus.SCHEDULED) {
            throw new TripNotBookableException(
                `Trip is in ${outboundTrip.status} status and cannot be booked`,
            );
        }

        if (outboundTrip.departureTime <= new Date()) {
            throw new TripNotBookableException(
                'Trip departure time has already passed',
            );
        }

        return this.createBooking(userId, {
            outboundTripId: outboundTrip.id,
            boardingStopId: dto.boardingStopId,
            alightingStopId: dto.alightingStopId,
            passengers: dto.passengers,
        });
    }

    /**
     * Shared booking transaction logic used by both createBookingFromTrip and createBookingFromSchedule
     */
    private async createBooking(
        userId: string,
        params: CreateBookingDto,
    ): Promise<{ booking: Booking; paymentUrl: string }> {
        const {
            outboundTripId,
            returnTripId,
            boardingStopId,
            alightingStopId,
            passengers,
        } = params;

        const passengerCount = passengers.length;

        // Transaction with retry logic for concurrency
        let retries = 3;
        while (retries > 0) {
            try {
                const result = await this.db.$transaction(
                    async (tx) => {
                        // Lock and validate outbound trip
                        const outboundTrip = await tx.trip.findUnique({
                            where: { id: outboundTripId },
                            include: {
                                route: {
                                    include: {
                                        routeStops: true,
                                    },
                                },
                            },
                        });

                        if (!outboundTrip) {
                            throw new TripNotFoundException(outboundTripId);
                        }

                        // Validate boarding and alighting stops
                        this.validateStops(
                            outboundTrip.route.routeStops,
                            outboundTrip.route.startLocationId,
                            outboundTrip.route.endLocationId,
                            boardingStopId,
                            alightingStopId,
                        );

                        if (outboundTrip.availableSeats < passengerCount) {
                            throw new InsufficientSeatsException(
                                outboundTrip.availableSeats,
                                passengerCount,
                            );
                        }

                        // Validate return trip if provided
                        let returnTrip: Trip | null = null;
                        if (returnTripId) {
                            returnTrip = await tx.trip.findUnique({
                                where: { id: returnTripId },
                            });

                            if (!returnTrip) {
                                throw new TripNotFoundException(returnTripId);
                            }

                            if (returnTrip.availableSeats < passengerCount) {
                                throw new InsufficientSeatsException(
                                    returnTrip.availableSeats,
                                    passengerCount,
                                );
                            }
                        }

                        // Calculate total price
                        const pricePerSeat =
                            outboundTrip.priceOverride ||
                            outboundTrip.route.basePrice;
                        const totalPrice = returnTripId
                            ? pricePerSeat * passengerCount * 2
                            : pricePerSeat * passengerCount;

                        // Generate payment reference
                        const paymentReference = `BK-${nanoid(16)}`;

                        // Create booking
                        const booking = await tx.booking.create({
                            data: {
                                userId,
                                outboundTripId,
                                returnTripId,
                                boardingStopId,
                                alightingStopId,
                                totalPrice,
                                status: BookingStatus.PAYMENT_PENDING,
                                paymentReference,
                                passengers: {
                                    create: passengers.map((p) => ({
                                        firstName: p.firstName,
                                        lastName: p.lastName,
                                        phoneNumber: p.phoneNumber,
                                        email: p.email,
                                        code: nanoid(8).toUpperCase(),
                                    })),
                                },
                            },
                            include: {
                                passengers: true,
                            },
                        });

                        // Create passenger trips with boarding tokens
                        const passengerTrips: PassengerTrip[] = [];

                        for (const passenger of booking.passengers) {
                            // Outbound trip
                            const outboundBoardingToken =
                                this.passengerService.generateBoardingToken(
                                    passenger.id,
                                    outboundTrip.id,
                                    booking.id,
                                    outboundTrip.departureTime,
                                );

                            const outboundPT = await tx.passengerTrip.create({
                                data: {
                                    passengerId: passenger.id,
                                    tripId: outboundTrip.id,
                                    boardingToken: outboundBoardingToken,
                                },
                            });
                            passengerTrips.push(outboundPT);

                            // Return trip if exists
                            if (returnTrip) {
                                const returnBoardingToken =
                                    this.passengerService.generateBoardingToken(
                                        passenger.id,
                                        returnTrip.id,
                                        booking.id,
                                        returnTrip.departureTime,
                                    );

                                const returnPT = await tx.passengerTrip.create({
                                    data: {
                                        passengerId: passenger.id,
                                        tripId: returnTrip.id,
                                        boardingToken: returnBoardingToken,
                                    },
                                });
                                passengerTrips.push(returnPT);
                            }
                        }

                        // Decrement available seats
                        await tx.trip.update({
                            where: { id: outboundTrip.id },
                            data: {
                                availableSeats: {
                                    decrement: passengerCount,
                                },
                            },
                        });

                        if (returnTrip) {
                            await tx.trip.update({
                                where: { id: returnTrip.id },
                                data: {
                                    availableSeats: {
                                        decrement: passengerCount,
                                    },
                                },
                            });
                        }

                        const detailedBooking =
                            await tx.booking.findUniqueOrThrow({
                                where: { id: booking.id },
                                include: BookingWithDetailsInclude,
                            });

                        return { booking: detailedBooking, passengerTrips };
                    },
                    {
                        isolationLevel:
                            Prisma.TransactionIsolationLevel.Serializable,
                        maxWait: 5000,
                        timeout: 10000,
                    },
                );

                const user = await this.userService.findUser({ id: userId });

                // Initialize payment
                const payment = await this.paymentService.initializeTransaction(
                    user.email,
                    result.booking.totalPrice,
                    result.booking.paymentReference!,
                    {
                        bookingId: result.booking.id,
                        userId,
                    },
                );

                // Emit event
                this.eventEmitter.emit(
                    'booking.created',
                    new BookingCreatedEvent(
                        result.booking.id,
                        userId,
                        outboundTripId,
                        returnTripId || null,
                        result.booking.passengers.map((p) => ({
                            id: p.id,
                            firstName: p.firstName,
                            lastName: p.lastName,
                            email: p.email || undefined,
                        })),
                    ),
                );

                return {
                    booking: result.booking,
                    paymentUrl: payment.authorizationUrl,
                };
            } catch (error) {
                const prismaError =
                    error as Prisma.PrismaClientKnownRequestError;
                if (prismaError.code === 'P2034') {
                    retries--;
                    if (retries > 0) {
                        this.logger.warn(
                            `Transaction conflict, retrying... (${retries} attempts left)`,
                        );
                        await new Promise((resolve) =>
                            setTimeout(resolve, 100 * (4 - retries)),
                        );
                        continue;
                    }
                }
                throw error;
            }
        }

        throw new Error('Failed to create booking after multiple retries');
    }

    /**
     * Confirm payment and update booking status
     */
    async confirmBooking(reference: string): Promise<void> {
        this.logger.log(`Confirming payment for reference: ${reference}`);

        const verification =
            await this.paymentService.verifyTransaction(reference);

        if (!verification.success) {
            this.logger.error(`Payment verification failed for ${reference}`);
            return;
        }

        const booking = await this.db.booking.findUnique({
            where: { paymentReference: reference },
        });

        if (!booking) {
            this.logger.error(`Booking not found for reference: ${reference}`);
            return;
        }

        if (booking.status !== BookingStatus.PAYMENT_PENDING) {
            this.logger.warn(`Booking ${booking.id} already processed`);
            return;
        }

        await this.db.booking.update({
            where: { id: booking.id },
            data: {
                status: BookingStatus.CONFIRMED,
                paidAt: verification.paidAt,
                paymentMethod: verification.channel,
            },
        });

        this.eventEmitter.emit(
            'booking.confirmed',
            new BookingConfirmedEvent(
                booking.id,
                booking.userId,
                reference,
                booking.totalPrice,
            ),
        );
    }

    /**
     * Cancel a booking
     */
    async cancelBooking(
        userId: string,
        bookingId: string,
        reason?: string,
    ): Promise<void> {
        this.logger.log(`Cancelling booking ${bookingId} for user ${userId}`);

        // Execute all DB consistency logic inside a single transaction
        const { shouldRefund, paymentReference } = await this.db.$transaction(
            async (tx) => {
                const booking = await tx.booking.findUnique({
                    where: { id: bookingId },
                    include: {
                        outboundTrip: true,
                        returnTrip: true,
                    },
                });

                if (!booking) {
                    throw new BookingNotFoundException(bookingId);
                }

                if (booking.status === BookingStatus.CANCELLED) {
                    throw new BookingAlreadyCancelledException(bookingId);
                }

                if (
                    booking.outboundTrip.status !== TripStatus.SCHEDULED ||
                    (booking.returnTrip &&
                        booking.returnTrip.status !== TripStatus.SCHEDULED)
                ) {
                    throw new BookingCancellationNotAllowedException(
                        'Trip has already started or is in progress',
                    );
                }

                const passengerCount = await tx.passenger.count({
                    where: { bookingId },
                });

                // Update booking status
                await tx.booking.update({
                    where: { id: bookingId },
                    data: { status: BookingStatus.CANCELLED },
                });

                // Restore seats
                await tx.trip.update({
                    where: { id: booking.outboundTripId },
                    data: {
                        availableSeats: { increment: passengerCount },
                    },
                });

                if (booking.returnTripId) {
                    await tx.trip.update({
                        where: { id: booking.returnTripId },
                        data: {
                            availableSeats: { increment: passengerCount },
                        },
                    });
                }

                return {
                    shouldRefund: booking.status === BookingStatus.CONFIRMED,
                    paymentReference: booking.paymentReference,
                };
            },
        );

        if (shouldRefund && paymentReference) {
            await this.paymentService.processRefund(paymentReference);
        }

        this.eventEmitter.emit(
            'booking.cancelled',
            new BookingCancelledEvent(bookingId, userId, reason),
        );

        this.logger.log(`Booking ${bookingId} cancelled successfully`);
    }

    /**
     * Get user bookings with pagination
     */
    async getUserBookings(
        userId: string,
        query: GetBookingsQueryDto,
    ): Promise<PaginatedResponse<Booking>['data']> {
        const { page, limit, status, tripStatus } = query;
        const skip = (page - 1) * limit;

        const where: Prisma.BookingWhereInput = {
            userId,
            ...(status && { status }),
            ...(tripStatus && {
                OR: [
                    { outboundTrip: { status: tripStatus } },
                    { returnTrip: { status: tripStatus } },
                ],
            }),
        };

        const [bookings, totalCount] = await Promise.all([
            this.db.booking.findMany({
                where,
                skip,
                take: limit,
                include: {
                    outboundTrip: true,
                    returnTrip: true,
                },
                orderBy: { createdAt: 'desc' },
            }),
            this.db.booking.count({ where }),
        ]);

        return {
            totalCount,
            page,
            limit,
            results: bookings,
            perPage: bookings.length,
        };
    }

    /**
     * Get booking details by ID
     */
    async getBookingById(bookingId: string): Promise<BookingWithDetails> {
        const booking = await this.db.booking.findUnique({
            where: { id: bookingId },
            include: BookingWithDetailsInclude,
        });

        if (!booking) {
            throw new BookingNotFoundException(bookingId);
        }

        return booking;
    }

    /**
     * Get boarding passes for a booking
     */
    async getBoardingPasses(bookingId: string) {
        const booking = await this.db.booking.findUnique({
            where: { id: bookingId },
            include: BookingWithPassengerTripsInclude,
        });

        if (!booking) {
            throw new BookingNotFoundException(bookingId);
        }

        const passes: Array<{
            passengerId: string;
            passengerName: string;
            passengerCode: string;
            tripId: string;
            tripCode: string;
            routeCode: string;
            qrCodeData: string;
            boardedAt: Date | null;
            seatNo: number | null;
        }> = [];

        for (const passenger of booking.passengers) {
            for (const pt of passenger.passengerTrips) {
                passes.push({
                    passengerId: passenger.id,
                    passengerName: `${passenger.firstName} ${passenger.lastName}`,
                    passengerCode: passenger.code,
                    tripId: pt.tripId,
                    tripCode: pt.trip.code,
                    routeCode: pt.trip.route.code,
                    qrCodeData: pt.boardingToken,
                    boardedAt: pt.boardedAt,
                    seatNo: pt.seatNo,
                });
            }
        }

        return passes;
    }

    /**
     * Validate that boarding and alighting stops are valid route stops with correct roles
     */
    private validateStops(
        routeStops: Array<{ stopId: string; sequence: number; role: StopRole }>,
        startLocationId: string,
        endLocationId: string,
        boardingStopId?: string,
        alightingStopId?: string,
    ): void {
        if (boardingStopId) {
            // Cannot board at end location
            if (boardingStopId === endLocationId) {
                throw new InvalidStopException(
                    boardingStopId,
                    'Cannot board at the route end location',
                );
            }

            const boardingStop = routeStops.find(
                (rs) => rs.stopId === boardingStopId,
            );

            if (!boardingStop) {
                throw new InvalidStopException(
                    boardingStopId,
                    'Stop is not part of this route',
                );
            }

            if (
                boardingStop.role !== StopRole.PICKUP_ONLY &&
                boardingStop.role !== StopRole.PICKUP_AND_DROPOFF
            ) {
                throw new InvalidStopException(
                    boardingStopId,
                    'Stop does not allow pickup',
                );
            }
        }

        if (alightingStopId) {
            // Cannot alight at start location
            if (alightingStopId === startLocationId) {
                throw new InvalidStopException(
                    alightingStopId,
                    'Cannot alight at the route start location',
                );
            }

            const alightingStop = routeStops.find(
                (rs) => rs.stopId === alightingStopId,
            );

            if (!alightingStop) {
                throw new InvalidStopException(
                    alightingStopId,
                    'Stop is not part of this route',
                );
            }

            if (
                alightingStop.role !== StopRole.DROPOFF_ONLY &&
                alightingStop.role !== StopRole.PICKUP_AND_DROPOFF
            ) {
                throw new InvalidStopException(
                    alightingStopId,
                    'Stop does not allow drop-off',
                );
            }
        }

        // Validate boarding comes before alighting in sequence
        if (boardingStopId && alightingStopId) {
            const boardingStop = routeStops.find(
                (rs) => rs.stopId === boardingStopId,
            )!;
            const alightingStop = routeStops.find(
                (rs) => rs.stopId === alightingStopId,
            )!;

            if (boardingStop.sequence >= alightingStop.sequence) {
                throw new InvalidStopException(
                    boardingStopId,
                    'Boarding stop must come before alighting stop in the route sequence',
                );
            }
        }
    }
}
