export class BookingCreatedEvent {
    constructor(
        public readonly bookingId: string,
        public readonly userId: string,
        public readonly outboundTripId: string,
        public readonly returnTripId: string | null,
        public readonly passengers: Array<{
            id: string;
            firstName: string;
            lastName: string;
            email?: string;
        }>,
    ) {}
}

export class BookingConfirmedEvent {
    constructor(
        public readonly bookingId: string,
        public readonly userId: string,
        public readonly paymentReference: string,
        public readonly totalPrice: number,
    ) {}
}

export class BookingCancelledEvent {
    constructor(
        public readonly bookingId: string,
        public readonly userId: string,
        public readonly reason?: string,
    ) {}
}

export class PassengerBoardedEvent {
    constructor(
        public readonly passengerTripId: string,
        public readonly passengerId: string,
        public readonly tripId: string,
        public readonly passengerName: string,
        public readonly boardedAt: Date,
    ) {}
}

export class TripBoardingOpenEvent {
    constructor(
        public readonly tripId: string,
        public readonly driverId: string,
        public readonly tripCode: string,
    ) {}
}

export class TripStartedEvent {
    constructor(
        public readonly tripId: string,
        public readonly driverId: string,
        public readonly tripCode: string,
    ) {}
}

export class TripCompletedEvent {
    constructor(
        public readonly tripId: string,
        public readonly driverId: string,
        public readonly tripCode: string,
    ) {}
}

export class TripScheduleCreatedEvent {
    constructor(
        public readonly scheduleId: string,
        public readonly routeId: string,
    ) {}
}

export class DriverAssignedEvent {
    constructor(
        public readonly tripId: string,
        public readonly driverId: string,
        public readonly tripCode: string,
    ) {}
}
