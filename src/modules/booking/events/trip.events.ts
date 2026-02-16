export class PassengerBoardedEvent {
    constructor(
        public readonly passengerTripId: string,
        public readonly passengerId: string,
        public readonly tripId: string,
        public readonly passengerName: string,
        public readonly boardedAt: Date,
    ) {}
}

export class PassengerAlightedEvent {
    constructor(
        public readonly passengerTripId: string,
        public readonly passengerId: string,
        public readonly tripId: string,
        public readonly passengerName: string,
        public readonly alightedAt: Date,
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

export class TripCancelledEvent {
    constructor(
        public readonly tripId: string,
        public readonly tripCode: string,
        public readonly reason: string,
    ) {}
}

export class StopStatusUpdatedEvent {
    constructor(
        public readonly tripId: string,
        public readonly stopId: string,
        public readonly status: string,
        public readonly actualArrival?: Date,
        public readonly actualDeparture?: Date,
    ) {}
}
