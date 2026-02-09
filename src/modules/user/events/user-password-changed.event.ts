export class UserPasswordChangedEvent {
    constructor(
        public readonly userId: string,
        public readonly email: string,
        public readonly firstName: string,
    ) {}
}
