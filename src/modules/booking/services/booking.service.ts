import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { DatabaseService } from '@/modules/database/database.service';
import {
    Prisma,
    TripStatus,
    BookingStatus,
    PassengerTrip,
    StopRole,
} from '@prisma/client';
import { nanoid } from 'nanoid';
import { PaginatedResponse } from '@/types';
import { UsersService } from '@/modules/user/users.service';
import { PassengerService } from '@/modules/booking/services/passenger.service';
import { TripCreationService } from '@/modules/booking/services/trip-creation.service';
import { PaymentService } from '@/modules/payment/payment.service';
import {
    CreateBookingDto,
    CreateBookingFromScheduleDto,
    GetBookingsQueryDto,
} from '@/modules/booking/dto/booking.dto';
import {
    BookingAlreadyCancelledException,
    BookingCancellationNotAllowedException,
    BookingNotFoundException,
    BookingTooFarInAdvanceException,
    CancellationWindowPassedException,
    InsufficientSeatsException,
    InvalidStopException,
} from '@/modules/booking/exceptions/booking.exception';
import {
    BookingWithDetailsInclude,
    TripEmbedInclude,
} from '@/modules/booking/types';
import {
    BookingCancelledEvent,
    BookingConfirmedEvent,
    BookingCreatedEvent,
} from '@/modules/booking/events/booking.events';
import {
    TripNotBookableException,
    TripNotFoundException,
} from '@/modules/booking/exceptions/trip.exception';
import { addDays, addHours, addMinutes, format } from 'date-fns';
import { TransactionIntentsToEventMap } from '@/modules/payment/transaction-intent';
import {
    BookingEmbedEntity,
    BookingEntity,
    CreateBookingData,
} from '@/modules/booking/entities/booking.entity';

@Injectable()
export class BookingService {
    private readonly logger = new Logger(BookingService.name);
    in;
    constructor(
        private readonly db: DatabaseService,
        private readonly userService: UsersService,
        private readonly passengerService: PassengerService,
        private readonly paymentService: PaymentService,
        private readonly tripCreationService: TripCreationService,
        private readonly eventEmitter: EventEmitter2,
        private readonly config: ConfigService,
    ) {}

    /**
     * Create a new booking with payment
     */
    async createBookingFromTrip(userId: string, dto: CreateBookingDto) {
        this.logger.log(
            `Creating booking for user ${userId}, trip ${dto.outboundTripId}`,
        );

        return this.createBooking(userId, dto);
    }

    /**
     * Create a booking from a trip schedule with lazy trip creation
     */
    async createBookingFromSchedule(
        userId: string,
        dto: CreateBookingFromScheduleDto,
    ) {
        this.logger.log(
            `Creating booking from schedule ${dto.tripScheduleId} for user ${userId} on ${dto.departureDate.toISOString()}`,
        );

        // Lazily get or create the trip for the requested schedule + date
        const outboundTrip =
            await this.tripCreationService.getOrCreateTripForSchedule(
                dto.tripScheduleId,
                dto.departureDate,
            );

        return this.createBooking(userId, {
            outboundTripId: outboundTrip.id,
            boardingStopId: dto.boardingStopId,
            alightingStopId: dto.alightingStopId,
            passengers: dto.passengers,
            paymentMethod: dto.paymentMethod,
            cardId: dto.cardId,
        });
    }

    /**
     * Shared booking transaction logic used by both createBookingFromTrip and createBookingFromSchedule
     */
    private async createBooking(
        userId: string,
        params: CreateBookingDto,
    ): Promise<CreateBookingData> {
        const {
            outboundTripId,
            returnTripId,
            boardingStopId,
            alightingStopId,
            passengers,
            paymentMethod,
            cardId,
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
                                route: true,
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

                        if (!outboundTrip) {
                            throw new TripNotFoundException(outboundTripId);
                        }

                        // only allow booking if trip is scheduled or boarding
                        if (
                            !(
                                outboundTrip.status === TripStatus.SCHEDULED ||
                                outboundTrip.status === TripStatus.BOARDING
                            )
                        ) {
                            throw new TripNotBookableException(
                                `Trip is in ${outboundTrip.status} status and cannot be booked`,
                            );
                        }

                        // Prevent booking too far in advance
                        const maxAdvanceDays = this.config.get<number>(
                            'BOOKING_MAX_ADVANCE_DAYS',
                            30,
                        );
                        if (
                            outboundTrip.departureTime >
                            addDays(new Date(), maxAdvanceDays)
                        ) {
                            throw new BookingTooFarInAdvanceException(
                                maxAdvanceDays,
                            );
                        }

                        // Validate boarding and alighting stops
                        this.validateStops(
                            outboundTrip.tripStopStatuses,
                            outboundTrip.startLocationId,
                            outboundTrip.endLocationId,
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
                        let returnTrip: Prisma.TripGetPayload<{
                            include: {
                                route: {
                                    include: {
                                        routeStops: true;
                                        startLocation: true;
                                        endLocation: true;
                                    };
                                };
                            };
                        }> | null = null;

                        if (returnTripId) {
                            returnTrip = await tx.trip.findUnique({
                                where: { id: returnTripId },
                                include: {
                                    route: {
                                        include: {
                                            routeStops: true,
                                            startLocation: true,
                                            endLocation: true,
                                        },
                                    },
                                },
                            });

                            if (!returnTrip) {
                                throw new TripNotFoundException(returnTripId);
                            }

                            if (
                                !(
                                    returnTrip.status ===
                                        TripStatus.SCHEDULED ||
                                    returnTrip.status === TripStatus.BOARDING
                                )
                            ) {
                                throw new TripNotBookableException(
                                    `Return trip is in ${returnTrip.status} status and cannot be booked`,
                                );
                            }

                            if (returnTrip.availableSeats < passengerCount) {
                                throw new InsufficientSeatsException(
                                    returnTrip.availableSeats,
                                    passengerCount,
                                );
                            }
                        }

                        // Calculate total price
                        const pricePerSeatForOutgoingTrip =
                            outboundTrip.priceOverride ||
                            outboundTrip.route.basePrice;
                        const pricePerSeatForReturnTrip =
                            returnTrip?.priceOverride ||
                            returnTrip?.route.basePrice ||
                            0;
                        const pricePerSeat = returnTrip
                            ? pricePerSeatForOutgoingTrip +
                              pricePerSeatForReturnTrip
                            : pricePerSeatForOutgoingTrip;
                        const totalPrice = pricePerSeat * passengerCount;

                        // Create booking
                        const booking = await tx.booking.create({
                            data: {
                                userId,
                                outboundTripId,
                                returnTripId,
                                reservationExpiresAt: addMinutes(
                                    new Date(),
                                    this.config.get<number>(
                                        'BOOKING_PAYMENT_TIMEOUT_MIN',
                                    ) ?? 15,
                                ),
                                boardingStopId:
                                    boardingStopId ||
                                    outboundTrip.route.startLocationId,
                                alightingStopId:
                                    alightingStopId ||
                                    outboundTrip.route.endLocationId,
                                totalPrice,
                                pricePerSeat: pricePerSeat,
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

                        // Create passenger trips
                        const passengerTrips: PassengerTrip[] = [];

                        for (const passenger of booking.passengers) {
                            // Outbound trip
                            const outboundPT = await tx.passengerTrip.create({
                                data: {
                                    passengerId: passenger.id,
                                    tripId: outboundTrip.id,
                                    boardingStopId:
                                        boardingStopId ||
                                        outboundTrip.route.startLocationId,
                                    alightingStopId:
                                        alightingStopId ||
                                        outboundTrip.route.endLocationId,
                                },
                            });
                            passengerTrips.push(outboundPT);

                            // Return trip if exists
                            if (returnTrip) {
                                const returnPT = await tx.passengerTrip.create({
                                    data: {
                                        passengerId: passenger.id,
                                        tripId: returnTrip.id,
                                        boardingStopId:
                                            returnTrip.route.startLocationId,
                                        alightingStopId:
                                            returnTrip.route.endLocationId,
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

                        return {
                            booking: detailedBooking,
                            passengerTrips,
                        };
                    },
                    {
                        isolationLevel:
                            Prisma.TransactionIsolationLevel.Serializable,
                        maxWait: 5000,
                        timeout: 10000,
                    },
                );

                const transaction = await this.paymentService.createTransaction(
                    userId,
                    {
                        amount: result.booking.totalPrice,
                        bookingId: result.booking.id,
                        description: `Payment for 
                                    ${result.booking.returnTrip ? 'outbound trip' : ''} ${result.booking.outboundTrip.code} from 
                                    ${result.booking.outboundTrip.startLocation.name} to ${result.booking.outboundTrip.endLocation.name} on ${format(result.booking.outboundTrip.departureTime, 'EEEE yyyy-MM-dd')}
                                   ${
                                       result.booking.returnTrip
                                           ? `and return trip ${result.booking.returnTrip.code} from ${result.booking.returnTrip.startLocation.name} to 
                                             ${result.booking.returnTrip.endLocation.name} on ${format(result.booking.returnTrip.departureTime, 'EEEE yyyy-MM-dd')}`
                                           : ''
                                   } for ${passengers.length} passenger(s)
                                    `
                            .replace(/\s+/g, ' ')
                            .trim(),
                        type: 'DEBIT',
                        intent: 'BOOKING_PAYMENT',
                        source: paymentMethod,
                        destination: 'PLATFORM',
                    },
                );

                const payment = await this.paymentService.acceptPayment({
                    source: paymentMethod,
                    transactionId: transaction.id,
                    cardId,
                });

                // Emit event
                this.eventEmitter.emit(
                    'booking.created',
                    new BookingCreatedEvent(
                        result.booking.id,
                        userId,
                        result.booking.outboundTrip.id,
                        result.booking.returnTrip
                            ? result.booking.returnTrip.id
                            : null,
                        result.booking.passengers.map((p) => ({
                            id: p.id,
                            firstName: p.firstName,
                            lastName: p.lastName,
                            email: p.email || undefined,
                        })),
                    ),
                );

                return {
                    booking: {
                        ...result.booking,
                        outboundTrip: {
                            ...result.booking.outboundTrip,
                            numStops:
                                result.booking.outboundTrip._count
                                    .tripStopStatuses,
                        },
                        returnTrip: result.booking.returnTrip
                            ? {
                                  ...result.booking.returnTrip,
                                  numStops:
                                      result.booking.returnTrip._count
                                          .tripStopStatuses,
                              }
                            : null,
                    },
                    payment: payment,
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
    @OnEvent(TransactionIntentsToEventMap.BOOKING_PAYMENT)
    async confirmBooking({
        transactionId,
    }: {
        transactionId: string;
    }): Promise<void> {
        const transaction = await this.db.transaction.findUnique({
            where: { id: transactionId },
            include: {
                booking: {
                    include: {
                        passengers: true,
                        outboundTrip: true,
                        returnTrip: true,
                    },
                },
            },
        });

        const booking = transaction?.booking;

        if (!booking) {
            this.logger.error(
                `Booking not found for transactionId: ${transactionId}`,
            );
            return;
        }

        if (booking.status === BookingStatus.CONFIRMED) {
            this.logger.warn(`Booking ${booking.id} already processed`);
            return;
        }

        await this.db.$transaction(async (tx) => {
            await tx.booking.update({
                where: { id: booking.id },
                data: {
                    status: BookingStatus.CONFIRMED,
                },
            });

            for (const passenger of booking.passengers) {
                const outboundBoardingToken =
                    this.passengerService.generateBoardingToken(
                        passenger.id,
                        booking.outboundTrip.id,
                        booking.id,
                        booking.outboundTrip.departureTime,
                    );

                await tx.passengerTrip.update({
                    where: {
                        passengerId_tripId: {
                            passengerId: passenger.id,
                            tripId: booking.outboundTrip.id,
                        },
                    },
                    data: {
                        boardingToken: outboundBoardingToken,
                        status: 'SCHEDULED',
                    },
                });

                if (booking.returnTrip) {
                    const returnBoardingToken =
                        this.passengerService.generateBoardingToken(
                            passenger.id,
                            booking.returnTrip.id,
                            booking.id,
                            booking.returnTrip.departureTime,
                        );

                    await tx.passengerTrip.update({
                        where: {
                            passengerId_tripId: {
                                passengerId: passenger.id,
                                tripId: booking.returnTrip.id,
                            },
                        },
                        data: {
                            boardingToken: returnBoardingToken,
                            status: 'SCHEDULED',
                        },
                    });
                }
            }
        });

        this.eventEmitter.emit(
            'booking.confirmed',
            new BookingConfirmedEvent(
                booking.id,
                booking.userId,
                transactionId,
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

        const cutoffHours = this.config.get<number>(
            'CANCELLATION_CUTOFF_HOURS',
            24,
        );
        const penaltyPercent = this.config.get<number>(
            'CANCELLATION_PENALTY_PERCENT',
            5,
        );
        const penaltyCap = this.config.get<number>(
            'CANCELLATION_PENALTY_CAP',
            5000,
        );
        const gracePeriodMin = this.config.get<number>(
            'CANCELLATION_GRACE_PERIOD_MIN',
            30,
        );

        const booking = await this.db.$transaction(async (tx) => {
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

            if (booking.status === BookingStatus.PENDING) {
                throw new BookingCancellationNotAllowedException(
                    'Cannot cancel a booking that has not been paid for',
                );
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

            // Enforce cancellation cutoff window
            const cutoffDeadline = addHours(new Date(), cutoffHours);
            if (
                booking.outboundTrip.departureTime <= cutoffDeadline &&
                (!booking.returnTrip ||
                    booking.returnTrip.departureTime <= cutoffDeadline)
            ) {
                throw new CancellationWindowPassedException(cutoffHours);
            }

            // Calculate penalty fee
            // - No fee within the free cancellation grace period
            // - Otherwise: penaltyPercent% of totalPrice, capped at penaltyCap
            const withinGracePeriod =
                gracePeriodMin > 0 &&
                new Date() <= addMinutes(booking.createdAt, gracePeriodMin);

            const rawPenalty = !withinGracePeriod
                ? booking.totalPrice * (penaltyPercent / 100)
                : 0;
            const fee =
                penaltyCap > 0 ? Math.min(rawPenalty, penaltyCap) : rawPenalty;

            const passengerCount = await tx.passenger.count({
                where: { bookingId },
            });

            // Update booking status and persist the fee
            await tx.booking.update({
                where: { id: bookingId },
                data: {
                    status: BookingStatus.CANCELLED,
                    cancellationFee: fee,
                },
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

            await tx.passengerTrip.updateMany({
                where: {
                    passenger: {
                        bookingId,
                    },
                },
                data: {
                    status: 'CANCELLED',
                    boardingToken: null,
                },
            });

            return tx.booking.findUniqueOrThrow({
                where: { id: bookingId },
                include: {
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
                    passengers: true,
                },
            });
        });

        const transaction = await this.paymentService.createTransaction(
            userId,
            {
                amount: booking.totalPrice - (booking.cancellationFee || 0),
                bookingId,
                description: `Booking refund for 
                                ${booking.returnTrip ? 'outbound trip' : ''} ${booking.outboundTrip.code} from 
                                ${booking.outboundTrip.route.startLocation.name} to ${booking.outboundTrip.route.endLocation.name} on ${format(booking.outboundTrip.departureTime, 'EEEE yyyy-MM-dd')}
                                ${
                                    booking.returnTrip
                                        ? `and return trip ${booking.returnTrip.code} from ${booking.returnTrip.route.startLocation.name} to 
                                            ${booking.returnTrip.route.endLocation.name} on ${format(booking.returnTrip.departureTime, 'EEEE yyyy-MM-dd')}`
                                        : ''
                                } for ${booking.passengers.length} passenger(s) on Personal wallet`
                    .replace(/\s+/g, ' ')
                    .trim(),
                type: 'CREDIT',
                intent: 'BOOKING_CANCELLATION_FEE',
                source: 'PLATFORM',
                destination: 'WALLET',
            },
        );

        await this.paymentService.transferFunds({
            transactionId: transaction.id,
        });

        this.eventEmitter.emit(
            'booking.cancelled',
            new BookingCancelledEvent(
                bookingId,
                userId,
                booking.cancellationFee || 0,
                reason,
            ),
        );

        this.logger.log(
            `Booking ${bookingId} cancelled successfully. Fee: ${booking.cancellationFee || 0}`,
        );
    }

    /**
     * Get bookings with pagination
     */
    async getBookings(
        userId: string,
        query: GetBookingsQueryDto,
    ): Promise<PaginatedResponse<BookingEmbedEntity>['data']> {
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
                    outboundTrip: {
                        include: TripEmbedInclude,
                    },
                    returnTrip: {
                        include: TripEmbedInclude,
                    },
                },
                orderBy: {
                    outboundTrip: { departureTime: 'asc' },
                },
            }),
            this.db.booking.count({ where }),
        ]);

        return {
            totalCount,
            page,
            limit,
            results: bookings.map((b) => ({
                ...b,
                outboundTrip: {
                    ...b.outboundTrip,
                    numStops: b.outboundTrip._count.tripStopStatuses,
                },
                returnTrip: b.returnTrip
                    ? {
                          ...b.returnTrip,
                          numStops: b.returnTrip._count.tripStopStatuses,
                      }
                    : null,
            })),
            perPage: bookings.length,
        };
    }

    /**
     * Get booking details by ID
     */
    async getBookingById(bookingId: string): Promise<BookingEntity> {
        const booking = await this.db.booking.findUnique({
            where: { id: bookingId },
            include: BookingWithDetailsInclude,
        });

        if (!booking) {
            throw new BookingNotFoundException(bookingId);
        }

        return {
            ...booking,
            outboundTrip: {
                ...booking.outboundTrip,
                numStops: booking.outboundTrip._count.tripStopStatuses,
            },
            returnTrip: booking.returnTrip
                ? {
                      ...booking.returnTrip,
                      numStops: booking.returnTrip._count.tripStopStatuses,
                  }
                : null,
        };
    }

    /**
     * Validate that boarding and alighting stops are valid stops with correct roles
     * Boarding can be at start location or intermediate stops with pickup role
     * Alighting can be at end location or intermediate stops with dropoff role
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

            // Boarding at start location is always allowed
            const isBoardingAtStart = boardingStopId === startLocationId;

            if (!isBoardingAtStart) {
                // Must be an intermediate stop with pickup role
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
        }

        if (alightingStopId) {
            // Cannot alight at start location
            if (alightingStopId === startLocationId) {
                throw new InvalidStopException(
                    alightingStopId,
                    'Cannot alight at the route start location',
                );
            }

            // Alighting at end location is always allowed
            const isAlightingAtEnd = alightingStopId === endLocationId;

            if (!isAlightingAtEnd) {
                // Must be an intermediate stop with dropoff role
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
        }

        // Validate boarding comes before alighting in sequence
        // Only need to check if both are intermediate stops
        if (boardingStopId && alightingStopId) {
            const boardingStop = routeStops.find(
                (rs) => rs.stopId === boardingStopId,
            );
            const alightingStop = routeStops.find(
                (rs) => rs.stopId === alightingStopId,
            );

            // If both are intermediate stops, check sequence order
            if (boardingStop && alightingStop) {
                if (boardingStop.sequence >= alightingStop.sequence) {
                    throw new InvalidStopException(
                        boardingStopId,
                        'Boarding stop must come before alighting stop in the route sequence',
                    );
                }
            }
            // Other cases are valid:
            // - Boarding at start, alighting at intermediate or end
            // - Boarding at intermediate, alighting at end
            // - Boarding at start, alighting at end
        }
    }
}
