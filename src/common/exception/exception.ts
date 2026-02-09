import { HttpException, HttpStatus } from '@nestjs/common';
import { Intent } from '@prisma/client';

export class AuthorNotFoundException extends HttpException {
    constructor(authorId: string) {
        super(
            `Author with id '${authorId}' does not exist`,
            HttpStatus.NOT_FOUND,
        );
    }
}

export class UserAlreadyExists extends HttpException {
    constructor() {
        super('User already exists', HttpStatus.BAD_REQUEST);
    }
}

export class UserWithEmailNotFoundException extends HttpException {
    constructor(email: string) {
        super(`User with email ${email} does not exist`, HttpStatus.NOT_FOUND);
    }
}

export class UserWithUsernameNotFoundException extends HttpException {
    constructor(username: string) {
        super(
            `User with username '${username}' does not exist`,
            HttpStatus.NOT_FOUND,
        );
    }
}

export class UserWithIdNotFoundException extends HttpException {
    constructor(id: string) {
        super(`User with id ${id} does not exist`, HttpStatus.NOT_FOUND);
    }
}

export class SessionNotFoundException extends HttpException {
    constructor() {
        super(`Session not found`, HttpStatus.NOT_FOUND);
    }
}

export class PasswordRequiredException extends HttpException {
    constructor() {
        super(
            'Your account does not have a password set up. Please set up a password to continue',
            HttpStatus.NOT_FOUND,
        );
    }
}

export interface ActionRequiredPayload {
    reason: string;
    message?: string;
    next: {
        action: string;
        token?: string;
        expiresIn?: number;
        meta?: Record<string, unknown>;
    };
}

export class ActionRequiredException extends HttpException {
    constructor(payload: ActionRequiredPayload) {
        super(payload, HttpStatus.OK);
    }
}

export interface AuthorizationRequiredPayload {
    operation: unknown;
    intent: Intent;
}

export class AuthorizationRequiredException<
    TResponseDto = unknown,
> extends HttpException {
    constructor(
        public readonly payload: AuthorizationRequiredPayload,
        public readonly responseDtoClass?: new () => TResponseDto,
        public readonly message: string = 'Authorization required. Please provide your credentials to proceed.',
    ) {
        super({ payload, message }, HttpStatus.OK);
    }
}
