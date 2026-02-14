export class AdminCreatedEvent {
    constructor(
        public readonly adminId: string,
        public readonly email: string,
        public readonly firstName: string,
    ) {}
}
