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
