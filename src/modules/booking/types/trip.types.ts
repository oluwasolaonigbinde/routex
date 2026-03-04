import { Prisma } from '@prisma/client';

/**
 * Include for trip with route details and route stops
 */
export const TripWithStopsInclude = Prisma.validator<Prisma.TripInclude>()({
    startLocation: true,
    endLocation: true,
    route: {
        include: {
            startLocation: true,
            endLocation: true,
        },
    },
    tripStopStatuses: {
        include: {
            stop: true,
        },
        orderBy: {
            sequence: 'asc',
        },
    },
    vehicle: true,
    driver: true,
});

export type TripWithStopsInclude = Prisma.TripGetPayload<{
    include: typeof TripWithStopsInclude;
}>;

/**
 * Include for trip embed (list view, no stops)
 */
export const TripEmbedInclude = Prisma.validator<Prisma.TripInclude>()({
    startLocation: true,
    endLocation: true,
    vehicle: true,
    driver: true,
    route: {
        include: {
            startLocation: true,
            endLocation: true,
        },
    },
    _count: {
        select: { tripStopStatuses: true },
    },
});

export type TripEmbedInclude = Prisma.TripGetPayload<{
    include: typeof TripEmbedInclude;
}>;

/**
 * Include for trip with basic route details (no stops)
 */
export const TripWithRouteBasicInclude = {
    route: {
        include: {
            startLocation: true,
            endLocation: true,
        },
    },
    vehicle: true,
} satisfies Prisma.TripInclude;
