import { TripEmbedInclude } from '@/modules/booking/types/trip.types';
import { Prisma } from '@prisma/client';

/**
 * Standard include for detailed booking queries
 */
export const BookingWithDetailsInclude = {
    passengers: {
        include: {
            passengerTrips: {
                include: {
                    trip: true,
                },
            },
        },
    },
    outboundTrip: {
        include: TripEmbedInclude,
    },
    returnTrip: {
        include: TripEmbedInclude,
    },
} satisfies Prisma.BookingInclude;

export type BookingWithDetails = Prisma.BookingGetPayload<{
    include: typeof BookingWithDetailsInclude;
}>;

/**
 * Include for booking with passengers and trips (for boarding passes)
 */
export const BookingWithPassengerTripsInclude = {
    passengers: {
        include: {
            passengerTrips: {
                include: {
                    trip: {
                        include: {
                            route: true,
                        },
                    },
                },
            },
        },
    },
} satisfies Prisma.BookingInclude;

export type BookingWithPassengerTrips = Prisma.BookingGetPayload<{
    include: typeof BookingWithPassengerTripsInclude;
}>;

/**
 * Basic booking include with trips only
 */
export const BookingBasicInclude = {
    outboundTrip: true,
    returnTrip: true,
} satisfies Prisma.BookingInclude;

export type BookingBasic = Prisma.BookingGetPayload<{
    include: typeof BookingBasicInclude;
}>;
