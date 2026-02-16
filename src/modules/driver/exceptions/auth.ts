import { HttpException, HttpStatus } from '@nestjs/common';

export class DriverWithEmailNotFoundException extends HttpException {
    constructor(email: string) {
        super(
            `Driver with email ${email} does not exist`,
            HttpStatus.NOT_FOUND,
        );
    }
}

export class DriverWithUsernameNotFoundException extends HttpException {
    constructor(username: string) {
        super(
            `Driver with username '${username}' does not exist`,
            HttpStatus.NOT_FOUND,
        );
    }
}

export class DriverWithIdNotFoundException extends HttpException {
    constructor(id: string) {
        super(`Driver with id ${id} does not exist`, HttpStatus.NOT_FOUND);
    }
}
