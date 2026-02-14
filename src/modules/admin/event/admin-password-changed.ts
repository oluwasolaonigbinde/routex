export class AdminPasswordChangedEvent {
    constructor(
        public readonly adminId: string,
        public readonly email: string,
        public readonly firstName: string,
    ) {}
}
