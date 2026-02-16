import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL as string,
});
const prisma = new PrismaClient({
    adapter: adapter,
});

const SALT_ROUNDS = 10;
const DEFAULT_PASSWORD = 'Password123!';

// ──────────────── DETERMINISTIC HELPERS ────────────────

/**
 * Generate a stable UUID-shaped ID from a seed string.
 * Same input always produces the same output — key to idempotency.
 * Generates valid UUID v4 format.
 */
function stableId(seed: string): string {
    const hash = crypto
        .createHash('sha256')
        .update(`routex-seed:${seed}`)
        .digest('hex');

    // Follow UUID v4 format (RFC 4122)
    // Set version to 4 (random) and variant to 10xx
    const part1 = hash.slice(0, 8);
    const part2 = hash.slice(8, 12);
    const part3 = '4' + hash.slice(13, 16); // Version 4
    const part4 =
        ((parseInt(hash.slice(16, 18), 16) & 0x3f) | 0x80)
            .toString(16)
            .padStart(2, '0') + hash.slice(18, 20); // Variant bits
    const part5 = hash.slice(20, 32);

    return [part1, part2, part3, part4, part5].join('-');
}

function stablePaymentRef(seed: string): string {
    const hash = crypto
        .createHash('sha256')
        .update(`routex-pay:${seed}`)
        .digest('hex');
    return `PAY-${hash.slice(0, 8).toUpperCase()}`;
}

function stablePassengerCode(seed: string): string {
    const hash = crypto
        .createHash('sha256')
        .update(`routex-psg:${seed}`)
        .digest('hex');
    return `PSG-${hash.slice(0, 6).toUpperCase()}`;
}

function generateBoardingToken(
    passengerTripId: string,
    tripId: string,
    bookingId: string,
    departureTime: Date,
): string {
    const secret = process.env.BOARDING_TOKEN_SECRET || 'dev-boarding-secret';
    const exp = Math.floor(departureTime.getTime() / 1000) + 4 * 3600;
    const payload = JSON.stringify({
        sub: passengerTripId,
        tripId,
        bookingId,
        iat: Math.floor(Date.now() / 1000),
        exp,
    });
    const b64 = Buffer.from(payload).toString('base64url');
    const sig = crypto
        .createHmac('sha256', secret)
        .update(b64)
        .digest('base64url');
    return `${b64}.${sig}`;
}

function setTime(date: Date, hours: number, minutes: number): Date {
    const d = new Date(date);
    d.setUTCHours(hours, minutes, 0, 0);
    return d;
}

function fmtDate(date: Date): string {
    return date.toISOString().split('T')[0].replace(/-/g, '');
}

function fmtDateReadable(date: Date): string {
    return date.toLocaleDateString('en-NG', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
    });
}

// ──────────────── STABLE IDS ────────────────

const IDS = {
    // Users
    user1: stableId('user-johndoe'),
    user2: stableId('user-janesmith'),
    user3: stableId('user-mikej'),

    // Admins
    admin1: stableId('admin-admin'),
    admin2: stableId('admin-opsadmin'),

    // Drivers
    driver1: stableId('driver-ade'),
    driver2: stableId('driver-chidi'),

    // Locations
    jibowu: stableId('loc-jibowu'),
    berger: stableId('loc-berger'),
    ore: stableId('loc-ore'),
    akure: stableId('loc-akure'),
    utako: stableId('loc-utako'),
    zuba: stableId('loc-zuba'),
    lokoja: stableId('loc-lokoja'),
    ibadanToll: stableId('loc-ibadan-toll'),

    // Vehicles
    busA1: stableId('veh-bus-a1'),
    minibusB1: stableId('veh-minibus-b1'),
    shuttleC1: stableId('veh-shuttle-c1'),
    busA2: stableId('veh-bus-a2'),
    minibusB2: stableId('veh-minibus-b2'),

    // Schedules
    schedule1: stableId('sched-lag-abj-0600'),
    schedule2: stableId('sched-lag-akr-0730'),
    schedule3: stableId('sched-abj-lok-0900'),
    schedule4: stableId('sched-lag-abj-1400'),

    // Trips
    trip1: stableId('trip-lag-abj-tomorrow-0600'),
    trip2: stableId('trip-lag-akr-tomorrow-0730'),
    trip3: stableId('trip-abj-lok-dayafter-0900'),
    trip4: stableId('trip-lag-abj-in3days-1400'),
    trip5: stableId('trip-lag-akr-yesterday-0730'),

    // Bookings
    booking1: stableId('booking-john-trip1'),
    booking2: stableId('booking-jane-trip2'),
    booking3: stableId('booking-mike-trip1'),
    booking4: stableId('booking-john-trip5'),
    booking5: stableId('booking-jane-trip4'),

    // Passengers
    psg1a: stableId('psg-john-doe-b1'),
    psg1b: stableId('psg-sarah-doe-b1'),
    psg2: stableId('psg-jane-smith-b2'),
    psg3a: stableId('psg-mike-johnson-b3'),
    psg3b: stableId('psg-grace-johnson-b3'),
    psg3c: stableId('psg-emeka-obi-b3'),
    psg4: stableId('psg-john-doe-b4'),
    psg5: stableId('psg-jane-smith-b5'),

    // PassengerTrips
    pt1a: stableId('pt-john-trip1'),
    pt1b: stableId('pt-sarah-trip1'),
    pt2: stableId('pt-jane-trip2'),
    pt3a: stableId('pt-mike-trip1'),
    pt3b: stableId('pt-grace-trip1'),
    pt3c: stableId('pt-emeka-trip1'),
    pt4: stableId('pt-john-trip5'),
    pt5: stableId('pt-jane-trip4'),

    // Notifications
    notif1: stableId('notif-john-booking-confirmed'),
    notif2: stableId('notif-john-trip-completed'),
    notif3: stableId('notif-jane-boarding-open'),
    notif4: stableId('notif-mike-payment-pending'),
} as const;

async function main() {
    console.log('🌱 Seeding database (idempotent)...\n');

    const hashedPassword = await bcrypt.hash(DEFAULT_PASSWORD, SALT_ROUNDS);

    // ──────────────── USERS ────────────────
    console.log('👤 Upserting users...');

    const userDefaults = {
        password: hashedPassword,
        tenant: 'USER' as const,
        emailVerifiedAt: new Date(),
    };

    const user1 = await prisma.user.upsert({
        where: { username: 'johndoe' },
        update: {},
        create: {
            id: IDS.user1,
            email: 'john.doe@example.com',
            username: 'johndoe',
            firstName: 'John',
            lastName: 'Doe',
            phone: '+2348012345678',
            city: 'Lagos',
            ...userDefaults,
        },
    });

    const user2 = await prisma.user.upsert({
        where: { username: 'janesmith' },
        update: {},
        create: {
            id: IDS.user2,
            email: 'jane.smith@example.com',
            username: 'janesmith',
            firstName: 'Jane',
            lastName: 'Smith',
            phone: '+2348023456789',
            city: 'Abuja',
            ...userDefaults,
        },
    });

    const user3 = await prisma.user.upsert({
        where: { username: 'mikej' },
        update: {},
        create: {
            id: IDS.user3,
            email: 'mike.johnson@example.com',
            username: 'mikej',
            firstName: 'Mike',
            lastName: 'Johnson',
            phone: '+2348034567890',
            city: 'Lagos',
            ...userDefaults,
        },
    });

    console.log('   ✓ 3 users');

    // ──────────────── ADMINS ────────────────
    console.log('🔑 Upserting admins...');

    await prisma.admin.upsert({
        where: { username: 'admin' },
        update: {},
        create: {
            id: IDS.admin1,
            email: 'admin@routex.com',
            username: 'admin',
            firstName: 'Super',
            lastName: 'Admin',
            password: hashedPassword,
            role: 'SUPERADMIN',
            tenant: 'ADMIN',
            emailVerifiedAt: new Date(),
        },
    });

    await prisma.admin.upsert({
        where: { username: 'opsadmin' },
        update: {},
        create: {
            id: IDS.admin2,
            email: 'ops@routex.com',
            username: 'opsadmin',
            firstName: 'Operations',
            lastName: 'Admin',
            password: hashedPassword,
            role: 'ADMIN',
            tenant: 'ADMIN',
            emailVerifiedAt: new Date(),
        },
    });

    console.log('   ✓ 2 admins');

    // ──────────────── DRIVERS ────────────────
    console.log('🚗 Upserting drivers...');

    const driver1 = await prisma.driver.upsert({
        where: { username: 'driver_ade' },
        update: {},
        create: {
            id: IDS.driver1,
            email: 'driver.ade@routex.com',
            username: 'driver_ade',
            firstName: 'Ade',
            lastName: 'Ogundimu',
            password: hashedPassword,
            tenant: 'DRIVER',
            phone: '+2348045678901',
            emailVerifiedAt: new Date(),
        },
    });

    const driver2 = await prisma.driver.upsert({
        where: { username: 'driver_chidi' },
        update: {},
        create: {
            id: IDS.driver2,
            email: 'driver.chidi@routex.com',
            username: 'driver_chidi',
            firstName: 'Chidi',
            lastName: 'Nwosu',
            password: hashedPassword,
            tenant: 'DRIVER',
            phone: '+2348056789012',
            emailVerifiedAt: new Date(),
        },
    });

    console.log('   ✓ 2 drivers');

    // ──────────────── LOCATIONS ────────────────
    console.log('📍 Upserting locations...');

    const locationData = [
        {
            id: IDS.jibowu,
            name: 'Jibowu Terminal, Lagos',
            latitude: 6.5244,
            longitude: 3.3792,
        },
        {
            id: IDS.berger,
            name: 'Berger Bus Stop, Lagos',
            latitude: 6.6018,
            longitude: 3.3515,
        },
        {
            id: IDS.ore,
            name: 'Ore Junction, Ondo',
            latitude: 6.7509,
            longitude: 4.8755,
        },
        {
            id: IDS.akure,
            name: 'Akure Motor Park, Ondo',
            latitude: 7.2526,
            longitude: 5.2103,
        },
        {
            id: IDS.utako,
            name: 'Utako Terminal, Abuja',
            latitude: 9.0579,
            longitude: 7.4951,
        },
        {
            id: IDS.zuba,
            name: 'Zuba Junction, Abuja',
            latitude: 9.0888,
            longitude: 7.2572,
        },
        {
            id: IDS.lokoja,
            name: 'Lokoja Park, Kogi',
            latitude: 7.7969,
            longitude: 6.7443,
        },
        {
            id: IDS.ibadanToll,
            name: 'Ibadan Toll Gate, Oyo',
            latitude: 7.3775,
            longitude: 3.947,
        },
    ] as const;

    for (const loc of locationData) {
        await prisma.location.upsert({
            where: { id: loc.id },
            update: {
                name: loc.name,
                latitude: loc.latitude,
                longitude: loc.longitude,
            },
            create: loc,
        });
    }

    console.log(`   ✓ ${locationData.length} locations`);

    // ──────────────── VEHICLES ────────────────
    console.log('🚌 Upserting vehicles...');

    const vehicleData = [
        {
            id: IDS.busA1,
            name: 'Higer Luxury Bus A1',
            totalSeats: 50,
            type: 'BUS',
        },
        {
            id: IDS.minibusB1,
            name: 'Toyota HiAce B1',
            totalSeats: 14,
            type: 'MINIBUS',
        },
        {
            id: IDS.shuttleC1,
            name: 'Toyota Sienna C1',
            totalSeats: 7,
            type: 'SHUTTLE',
        },
        {
            id: IDS.busA2,
            name: 'Higer Luxury Bus A2',
            totalSeats: 50,
            type: 'BUS',
        },
        {
            id: IDS.minibusB2,
            name: 'Toyota HiAce B2',
            totalSeats: 14,
            type: 'MINIBUS',
        },
    ] as const;

    for (const v of vehicleData) {
        await prisma.vehicle.upsert({
            where: { id: v.id },
            update: { name: v.name, totalSeats: v.totalSeats, type: v.type },
            create: v,
        });
    }

    console.log(`   ✓ ${vehicleData.length} vehicles`);

    // ──────────────── ROUTES ────────────────
    console.log('🛣️  Upserting routes...');

    const lagosAbuja = await prisma.route.upsert({
        where: { code: 'LAG-ABJ' },
        update: {},
        create: {
            code: 'LAG-ABJ',
            startLocationId: IDS.jibowu,
            endLocationId: IDS.utako,
            basePrice: 18000,
            distanceKm: 750,
            estimatedDurationMin: 540,
        },
    });

    const lagosAkure = await prisma.route.upsert({
        where: { code: 'LAG-AKR' },
        update: {},
        create: {
            code: 'LAG-AKR',
            startLocationId: IDS.jibowu,
            endLocationId: IDS.akure,
            basePrice: 7500,
            distanceKm: 300,
            estimatedDurationMin: 240,
        },
    });

    const abujaLokoja = await prisma.route.upsert({
        where: { code: 'ABJ-LOK' },
        update: {},
        create: {
            code: 'ABJ-LOK',
            startLocationId: IDS.utako,
            endLocationId: IDS.lokoja,
            basePrice: 5000,
            distanceKm: 190,
            estimatedDurationMin: 150,
        },
    });

    console.log('   ✓ 3 routes');

    // ──────────────── ROUTE STOPS ────────────────
    console.log('🚏 Upserting route stops...');

    type StopData = {
        routeId: string;
        stopId: string;
        sequence: number;
        role: 'PICKUP_ONLY' | 'DROPOFF_ONLY' | 'PICKUP_AND_DROPOFF';
        departureOffsetMin: number;
    };

    const allStops: StopData[] = [
        // Lagos -> Abuja (intermediate stops only)
        {
            routeId: lagosAbuja.id,
            stopId: IDS.berger,
            sequence: 1,
            role: 'PICKUP_ONLY',
            departureOffsetMin: 30,
        },
        {
            routeId: lagosAbuja.id,
            stopId: IDS.ibadanToll,
            sequence: 2,
            role: 'PICKUP_AND_DROPOFF',
            departureOffsetMin: 90,
        },
        {
            routeId: lagosAbuja.id,
            stopId: IDS.lokoja,
            sequence: 3,
            role: 'PICKUP_AND_DROPOFF',
            departureOffsetMin: 360,
        },
        {
            routeId: lagosAbuja.id,
            stopId: IDS.zuba,
            sequence: 4,
            role: 'DROPOFF_ONLY',
            departureOffsetMin: 480,
        },
        // Lagos -> Akure (intermediate stops only)
        {
            routeId: lagosAkure.id,
            stopId: IDS.berger,
            sequence: 1,
            role: 'PICKUP_ONLY',
            departureOffsetMin: 30,
        },
        {
            routeId: lagosAkure.id,
            stopId: IDS.ore,
            sequence: 2,
            role: 'PICKUP_AND_DROPOFF',
            departureOffsetMin: 120,
        },
        // Abuja -> Lokoja (intermediate stops only)
        {
            routeId: abujaLokoja.id,
            stopId: IDS.zuba,
            sequence: 1,
            role: 'PICKUP_ONLY',
            departureOffsetMin: 30,
        },
    ];

    for (const stop of allStops) {
        await prisma.routeStop.upsert({
            where: {
                routeId_sequence: {
                    routeId: stop.routeId,
                    sequence: stop.sequence,
                },
            },
            update: {
                stopId: stop.stopId,
                role: stop.role,
                departureOffsetMin: stop.departureOffsetMin,
            },
            create: stop,
        });
    }

    console.log(`   ✓ ${allStops.length} route stops`);

    // ──────────────── TRIP SCHEDULES ────────────────
    console.log('📅 Upserting trip schedules...');

    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    const in30Days = new Date(today);
    in30Days.setDate(in30Days.getDate() + 30);

    const scheduleData = [
        {
            id: IDS.schedule1,
            routeId: lagosAbuja.id,
            vehicleId: IDS.busA1,
            departureTime: '06:00',
            arrivalOffsetMin: 540,
            startDate: today,
            endDate: in30Days,
            recurrence: 'DAILY' as const,
            daysOfWeek: [] as number[],
            isActive: true,
        },
        {
            id: IDS.schedule2,
            routeId: lagosAkure.id,
            vehicleId: IDS.minibusB1,
            departureTime: '07:30',
            arrivalOffsetMin: 240,
            startDate: today,
            endDate: in30Days,
            recurrence: 'DAILY' as const,
            daysOfWeek: [] as number[],
            isActive: true,
        },
        {
            id: IDS.schedule3,
            routeId: abujaLokoja.id,
            vehicleId: IDS.shuttleC1,
            departureTime: '09:00',
            arrivalOffsetMin: 150,
            startDate: today,
            endDate: in30Days,
            recurrence: 'WEEKLY' as const,
            daysOfWeek: [1, 3, 5],
            isActive: true,
        },
        {
            id: IDS.schedule4,
            routeId: lagosAbuja.id,
            vehicleId: IDS.busA2,
            departureTime: '14:00',
            arrivalOffsetMin: 540,
            startDate: today,
            endDate: in30Days,
            recurrence: 'DAILY' as const,
            daysOfWeek: [] as number[],
            isActive: true,
        },
    ];

    for (const s of scheduleData) {
        await prisma.tripSchedule.upsert({
            where: { id: s.id },
            update: {},
            create: s,
        });
    }

    console.log(`   ✓ ${scheduleData.length} trip schedules`);

    // ──────────────── TRIPS ────────────────
    console.log('🚍 Upserting trips...');

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const dayAfter = new Date(today);
    dayAfter.setDate(dayAfter.getDate() + 2);

    const in3Days = new Date(today);
    in3Days.setDate(in3Days.getDate() + 3);

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const tripDefs = [
        {
            id: IDS.trip1,
            code: `LAG-ABJ-${fmtDate(tomorrow)}-0600`,
            routeId: lagosAbuja.id,
            vehicleId: IDS.busA1,
            driverId: driver1.id,
            departureTime: setTime(tomorrow, 6, 0),
            availableSeats: 45,
            status: 'SCHEDULED' as const,
            tripScheduleId: IDS.schedule1,
            tripScheduleDate: tomorrow,
        },
        {
            id: IDS.trip2,
            code: `LAG-AKR-${fmtDate(tomorrow)}-0730`,
            routeId: lagosAkure.id,
            vehicleId: IDS.minibusB1,
            driverId: driver2.id,
            departureTime: setTime(tomorrow, 7, 30),
            availableSeats: 10,
            status: 'BOARDING' as const,
            tripScheduleId: IDS.schedule2,
            tripScheduleDate: tomorrow,
        },
        {
            id: IDS.trip3,
            code: `ABJ-LOK-${fmtDate(dayAfter)}-0900`,
            routeId: abujaLokoja.id,
            vehicleId: IDS.shuttleC1,
            driverId: null,
            departureTime: setTime(dayAfter, 9, 0),
            availableSeats: 7,
            status: 'SCHEDULED' as const,
            tripScheduleId: IDS.schedule3,
            tripScheduleDate: dayAfter,
        },
        {
            id: IDS.trip4,
            code: `LAG-ABJ-${fmtDate(in3Days)}-1400`,
            routeId: lagosAbuja.id,
            vehicleId: IDS.busA2,
            driverId: null,
            departureTime: setTime(in3Days, 14, 0),
            availableSeats: 50,
            status: 'SCHEDULED' as const,
            tripScheduleId: IDS.schedule4,
            tripScheduleDate: in3Days,
        },
        {
            id: IDS.trip5,
            code: `LAG-AKR-${fmtDate(yesterday)}-0730`,
            routeId: lagosAkure.id,
            vehicleId: IDS.minibusB2,
            driverId: driver1.id,
            departureTime: setTime(yesterday, 7, 30),
            availableSeats: 8,
            status: 'COMPLETED' as const,
            tripScheduleId: IDS.schedule2,
            tripScheduleDate: yesterday,
        },
    ];

    let totalTripStops = 0;

    for (const t of tripDefs) {
        await prisma.trip.upsert({
            where: { code: t.code },
            update: {},
            create: t,
        });

        // Get route stops for this trip's route
        const routeStops = await prisma.routeStop.findMany({
            where: { routeId: t.routeId },
            orderBy: { sequence: 'asc' },
        });

        // Create trip stop statuses for each route stop
        for (const routeStop of routeStops) {
            const stopStatus: {
                tripId: string;
                stopId: string;
                sequence: number;
                status: 'PENDING' | 'ARRIVED' | 'DEPARTED' | 'SKIPPED';
                role: 'PICKUP_ONLY' | 'DROPOFF_ONLY' | 'PICKUP_AND_DROPOFF';
                actualArrival?: Date;
                actualDeparture?: Date;
            } = {
                tripId: t.id,
                stopId: routeStop.stopId,
                sequence: routeStop.sequence,
                status: 'PENDING',
                role: routeStop.role,
                actualArrival: undefined,
                actualDeparture: undefined,
            };

            // Set status based on trip status
            if (t.status === 'COMPLETED') {
                // For completed trips, mark all stops as departed except the last one
                const isLastStop = routeStop.sequence === routeStops.length;
                stopStatus.status = isLastStop ? 'ARRIVED' : 'DEPARTED';

                // Calculate approximate times based on departureOffsetMin
                const offsetMinutes = routeStop.departureOffsetMin || 0;
                stopStatus.actualArrival = new Date(
                    t.departureTime.getTime() + offsetMinutes * 60000,
                );
                if (!isLastStop) {
                    stopStatus.actualDeparture = new Date(
                        stopStatus.actualArrival.getTime() + 5 * 60000,
                    ); // 5 min stop
                }
            } else if (t.status === 'BOARDING') {
                // For boarding trips, mark first stop as departed
                if (routeStop.sequence === 1) {
                    stopStatus.status = 'DEPARTED';
                    stopStatus.actualArrival = new Date(
                        t.departureTime.getTime() - 5 * 60000,
                    ); // 5 min early
                    stopStatus.actualDeparture = new Date(
                        t.departureTime.getTime() + 5 * 60000,
                    ); // 5 min late
                }
            }

            await prisma.tripStopStatus.upsert({
                where: {
                    tripId_stopId: {
                        tripId: stopStatus.tripId,
                        stopId: stopStatus.stopId,
                    },
                },
                update: {
                    status: stopStatus.status,
                    actualArrival: stopStatus.actualArrival,
                    actualDeparture: stopStatus.actualDeparture,
                },
                create: stopStatus,
            });

            totalTripStops++;
        }
    }

    console.log(`   ✓ ${tripDefs.length} trips`);
    console.log(`   ✓ ${totalTripStops} trip stop statuses`);

    // ──────────────── BOOKINGS ────────────────
    console.log('🎫 Upserting bookings with passengers...');

    async function upsertBooking(def: {
        id: string;
        userId: string;
        outboundTripId: string;
        returnTripId?: string;
        totalPrice: number;
        boardingStopId?: string;
        alightingStopId?: string;
        paymentRef: string;
        paymentMethod?: string;
        paidAt?: Date;
        status:
            | 'PENDING'
            | 'PAYMENT_PENDING'
            | 'CONFIRMED'
            | 'CANCELLED'
            | 'REFUNDED';
        passengers: Array<{
            id: string;
            firstName: string;
            lastName: string;
            phoneNumber: string;
            email?: string;
            code: string;
            trips: Array<{
                ptId: string;
                tripId: string;
                departureTime: Date;
                seatNo?: number;
                boardedAt?: Date;
                alightedAt?: Date;
            }>;
        }>;
    }) {
        // Fetch the outbound trip with route to get fallback values
        const outboundTrip = await prisma.trip.findUnique({
            where: { id: def.outboundTripId },
            include: { route: true },
        });

        if (!outboundTrip) {
            throw new Error(`Trip ${def.outboundTripId} not found`);
        }

        // Use COALESCE logic: booking stops if provided, otherwise route start/end
        const actualBoardingStopId =
            def.boardingStopId ?? outboundTrip.route.startLocationId;
        const actualAlightingStopId =
            def.alightingStopId ?? outboundTrip.route.endLocationId;

        const booking = await prisma.booking.upsert({
            where: { paymentReference: def.paymentRef },
            update: {},
            create: {
                id: def.id,
                userId: def.userId,
                outboundTripId: def.outboundTripId,
                returnTripId: def.returnTripId,
                totalPrice: def.totalPrice,
                boardingStopId: actualBoardingStopId,
                alightingStopId: actualAlightingStopId,
                paymentReference: def.paymentRef,
                paymentMethod: def.paymentMethod,
                paidAt: def.paidAt,
                status: def.status,
            },
        });

        for (const p of def.passengers) {
            const passenger = await prisma.passenger.upsert({
                where: { code: p.code },
                update: {},
                create: {
                    id: p.id,
                    bookingId: booking.id,
                    firstName: p.firstName,
                    lastName: p.lastName,
                    phoneNumber: p.phoneNumber,
                    email: p.email,
                    code: p.code,
                },
            });

            for (const pt of p.trips) {
                await prisma.passengerTrip.upsert({
                    where: {
                        passengerId_tripId: {
                            passengerId: passenger.id,
                            tripId: pt.tripId,
                        },
                    },
                    update: {},
                    create: {
                        id: pt.ptId,
                        passengerId: passenger.id,
                        tripId: pt.tripId,
                        boardingStopId: actualBoardingStopId,
                        alightingStopId: actualAlightingStopId,
                        boardingToken: generateBoardingToken(
                            pt.ptId,
                            pt.tripId,
                            booking.id,
                            pt.departureTime,
                        ),
                        seatNo: pt.seatNo,
                        boardedAt: pt.boardedAt,
                        alightedAt: pt.alightedAt,
                    },
                });
            }
        }

        return booking;
    }

    const trip1Departure = setTime(tomorrow, 6, 0);
    const trip2Departure = setTime(tomorrow, 7, 30);
    const trip4Departure = setTime(in3Days, 14, 0);
    const trip5Departure = setTime(yesterday, 7, 30);

    // Booking 1: John -> Lagos->Abuja (CONFIRMED, 2 passengers)
    await upsertBooking({
        id: IDS.booking1,
        userId: user1.id,
        outboundTripId: IDS.trip1,
        totalPrice: 36000,
        boardingStopId: IDS.jibowu,
        alightingStopId: IDS.utako,
        paymentRef: stablePaymentRef('booking1'),
        paymentMethod: 'paystack',
        paidAt: new Date(),
        status: 'CONFIRMED',
        passengers: [
            {
                id: IDS.psg1a,
                firstName: 'John',
                lastName: 'Doe',
                phoneNumber: '+2348012345678',
                email: 'john.doe@example.com',
                code: stablePassengerCode('john-b1'),
                trips: [
                    {
                        ptId: IDS.pt1a,
                        tripId: IDS.trip1,
                        departureTime: trip1Departure,
                        seatNo: 1,
                    },
                ],
            },
            {
                id: IDS.psg1b,
                firstName: 'Sarah',
                lastName: 'Doe',
                phoneNumber: '+2348012345679',
                email: 'sarah.doe@example.com',
                code: stablePassengerCode('sarah-b1'),
                trips: [
                    {
                        ptId: IDS.pt1b,
                        tripId: IDS.trip1,
                        departureTime: trip1Departure,
                        seatNo: 2,
                    },
                ],
            },
        ],
    });

    // Booking 2: Jane -> Lagos->Akure (CONFIRMED, already boarded)
    await upsertBooking({
        id: IDS.booking2,
        userId: user2.id,
        outboundTripId: IDS.trip2,
        totalPrice: 7500,
        boardingStopId: IDS.jibowu,
        alightingStopId: IDS.akure,
        paymentRef: stablePaymentRef('booking2'),
        paymentMethod: 'paystack',
        paidAt: new Date(),
        status: 'CONFIRMED',
        passengers: [
            {
                id: IDS.psg2,
                firstName: 'Jane',
                lastName: 'Smith',
                phoneNumber: '+2348023456789',
                email: 'jane.smith@example.com',
                code: stablePassengerCode('jane-b2'),
                trips: [
                    {
                        ptId: IDS.pt2,
                        tripId: IDS.trip2,
                        departureTime: trip2Departure,
                        seatNo: 3,
                        boardedAt: new Date(),
                    },
                ],
            },
        ],
    });

    // Booking 3: Mike -> Lagos->Abuja (PAYMENT_PENDING, 3 passengers)
    await upsertBooking({
        id: IDS.booking3,
        userId: user3.id,
        outboundTripId: IDS.trip1,
        totalPrice: 54000,
        boardingStopId: IDS.berger,
        alightingStopId: IDS.utako,
        paymentRef: stablePaymentRef('booking3'),
        status: 'PAYMENT_PENDING',
        passengers: [
            {
                id: IDS.psg3a,
                firstName: 'Mike',
                lastName: 'Johnson',
                phoneNumber: '+2348034567890',
                email: 'mike.johnson@example.com',
                code: stablePassengerCode('mike-b3'),
                trips: [
                    {
                        ptId: IDS.pt3a,
                        tripId: IDS.trip1,
                        departureTime: trip1Departure,
                    },
                ],
            },
            {
                id: IDS.psg3b,
                firstName: 'Grace',
                lastName: 'Johnson',
                phoneNumber: '+2348034567891',
                code: stablePassengerCode('grace-b3'),
                trips: [
                    {
                        ptId: IDS.pt3b,
                        tripId: IDS.trip1,
                        departureTime: trip1Departure,
                    },
                ],
            },
            {
                id: IDS.psg3c,
                firstName: 'Emeka',
                lastName: 'Obi',
                phoneNumber: '+2348034567892',
                email: 'emeka.obi@example.com',
                code: stablePassengerCode('emeka-b3'),
                trips: [
                    {
                        ptId: IDS.pt3c,
                        tripId: IDS.trip1,
                        departureTime: trip1Departure,
                    },
                ],
            },
        ],
    });

    // Booking 4: John past trip (CONFIRMED, completed)
    await upsertBooking({
        id: IDS.booking4,
        userId: user1.id,
        outboundTripId: IDS.trip5,
        totalPrice: 7500,
        boardingStopId: IDS.jibowu,
        alightingStopId: IDS.akure,
        paymentRef: stablePaymentRef('booking4'),
        paymentMethod: 'paystack',
        paidAt: new Date(yesterday.getTime() - 86400000),
        status: 'CONFIRMED',
        passengers: [
            {
                id: IDS.psg4,
                firstName: 'John',
                lastName: 'Doe',
                phoneNumber: '+2348012345678',
                email: 'john.doe@example.com',
                code: stablePassengerCode('john-b4'),
                trips: [
                    {
                        ptId: IDS.pt4,
                        tripId: IDS.trip5,
                        departureTime: trip5Departure,
                        seatNo: 5,
                        boardedAt: setTime(yesterday, 7, 28),
                        alightedAt: setTime(yesterday, 11, 30),
                    },
                ],
            },
        ],
    });

    // Booking 5: Jane cancelled booking
    await upsertBooking({
        id: IDS.booking5,
        userId: user2.id,
        outboundTripId: IDS.trip4,
        totalPrice: 18000,
        paymentRef: stablePaymentRef('booking5'),
        paymentMethod: 'paystack',
        paidAt: new Date(),
        status: 'CANCELLED',
        passengers: [
            {
                id: IDS.psg5,
                firstName: 'Jane',
                lastName: 'Smith',
                phoneNumber: '+2348023456789',
                code: stablePassengerCode('jane-b5'),
                trips: [
                    {
                        ptId: IDS.pt5,
                        tripId: IDS.trip4,
                        departureTime: trip4Departure,
                    },
                ],
            },
        ],
    });

    console.log('   ✓ 5 bookings, 8 passengers');

    // ──────────────── NOTIFICATIONS ────────────────
    console.log('🔔 Upserting notifications...');

    const notifications = [
        {
            id: IDS.notif1,
            userId: user1.id,
            tenant: 'USER' as const,
            type: 'BOOKING_CONFIRMED',
            title: 'Booking Confirmed',
            message: `Your booking for Lagos → Abuja on ${fmtDateReadable(tomorrow)} has been confirmed.`,
            metadata: { bookingId: IDS.booking1 },
            isRead: false,
        },
        {
            id: IDS.notif2,
            userId: user1.id,
            tenant: 'USER' as const,
            type: 'TRIP_COMPLETED',
            title: 'Trip Completed',
            message: `Your Lagos → Akure trip on ${fmtDateReadable(yesterday)} has been completed. Thank you for travelling with us!`,
            metadata: { bookingId: IDS.booking4 },
            isRead: true,
        },
        {
            id: IDS.notif3,
            userId: user2.id,
            tenant: 'USER' as const,
            type: 'BOARDING_OPEN',
            title: 'Boarding Now Open',
            message:
                'Boarding is now open for your Lagos → Akure trip. Please proceed to Jibowu Terminal.',
            metadata: { tripId: IDS.trip2, bookingId: IDS.booking2 },
            isRead: false,
        },
        {
            id: IDS.notif4,
            userId: user3.id,
            tenant: 'USER' as const,
            type: 'PAYMENT_PENDING',
            title: 'Complete Your Payment',
            message:
                'Your booking for Lagos → Abuja is awaiting payment. Complete payment to confirm your seats.',
            metadata: { bookingId: IDS.booking3 },
            isRead: false,
        },
    ];

    for (const n of notifications) {
        await prisma.notification.upsert({
            where: { id: n.id },
            update: {},
            create: n,
        });
    }

    console.log(`   ✓ ${notifications.length} notifications`);

    // ──────────────── SUMMARY ────────────────
    console.log('\n═══════════════════════════════════════════');
    console.log('🌱 Seed completed successfully (idempotent)!\n');
    console.log('📊 Summary:');
    console.log('   Users:          3  (johndoe, janesmith, mikej)');
    console.log('   Admins:         2  (admin, opsadmin)');
    console.log('   Drivers:        2  (driver_ade, driver_chidi)');
    console.log('   Locations:      8');
    console.log('   Vehicles:       5');
    console.log('   Routes:         3  (LAG-ABJ, LAG-AKR, ABJ-LOK)');
    console.log('   Route Stops:    13');
    console.log('   Schedules:      4');
    console.log('   Trips:          5  (1 BOARDING, 3 SCHEDULED, 1 COMPLETED)');
    console.log(
        '   Bookings:       5  (2 CONFIRMED, 1 PAYMENT_PENDING, 1 CANCELLED, 1 completed)',
    );
    console.log('   Passengers:     8');
    console.log('   Notifications:  4');
    console.log(`\n🔑 Default password for all accounts: ${DEFAULT_PASSWORD}`);
    console.log('═══════════════════════════════════════════\n');
}

main()
    .catch((e) => {
        console.error('❌ Seed failed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
