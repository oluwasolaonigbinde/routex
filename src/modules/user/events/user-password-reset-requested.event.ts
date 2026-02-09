export class UserPasswordResetRequestedEvent {
    constructor(
        public readonly userId: string,
        public readonly email: string,
        public readonly firstName: string,
    ) {}
}
