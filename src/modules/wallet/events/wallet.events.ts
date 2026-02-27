export class WalletFundedEvent {
    constructor(
        public readonly userId: string,
        public readonly amount: number,
        public readonly newBalance: number,
        public readonly transactionId: string,
    ) {}
}

export class WalletDebitedEvent {
    constructor(
        public readonly userId: string,
        public readonly amount: number,
        public readonly newBalance: number,
        public readonly bookingId: string,
        public readonly reference: string,
    ) {}
}
