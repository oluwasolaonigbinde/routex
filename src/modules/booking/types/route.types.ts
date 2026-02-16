import { Prisma } from '@prisma/client';

/*
 * Include for route with start/end location and stops with their details
 */
export const RouteIncludes = Prisma.validator<Prisma.RouteInclude>()({
    startLocation: true,
    endLocation: true,
    routeStops: {
        include: { stop: true },
        orderBy: { sequence: 'asc' as const },
    },
});
