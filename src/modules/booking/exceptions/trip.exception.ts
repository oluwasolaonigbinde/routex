import { HttpException, HttpStatus } from '@nestjs/common';

export class TripDriverNotAvailableException extends HttpException {
    constructor() {
        super(
            {
                status: 'failed',
                message:
                    'Driver information is not available for this trip at the moment. Please try again later.',
            },
            HttpStatus.NOT_FOUND,
        );
    }
}

export class TripNotFoundException extends HttpException {
    constructor(tripId?: string) {
        super(
            {
                status: 'failed',
                message: tripId
                    ? `Trip with ID ${tripId} not found`
                    : 'Trip not found',
            },
            HttpStatus.NOT_FOUND,
        );
    }
}

export class TripScheduleNotFoundException extends HttpException {
    constructor(scheduleId?: string) {
        super(
            {
                status: 'failed',
                message: scheduleId
                    ? `Trip schedule with ID ${scheduleId} not found`
                    : 'Trip schedule not found',
            },
            HttpStatus.NOT_FOUND,
        );
    }
}

export class BoardingTokenExpiredException extends HttpException {
    constructor() {
        super(
            {
                status: 'failed',
                message: 'Boarding token has expired',
            },
            HttpStatus.UNAUTHORIZED,
        );
    }
}

export class BoardingTokenInvalidException extends HttpException {
    constructor(reason?: string) {
        super(
            {
                status: 'failed',
                message: reason || 'Invalid boarding token',
            },
            HttpStatus.UNAUTHORIZED,
        );
    }
}

export class BoardingNotOpenException extends HttpException {
    constructor() {
        super(
            {
                status: 'failed',
                message: 'Boarding is not currently open for this trip',
            },
            HttpStatus.BAD_REQUEST,
        );
    }
}

export class InvalidTripTransitionException extends HttpException {
    constructor(from: string, to: string) {
        super(
            {
                status: 'failed',
                message: `Invalid trip status transition from ${from} to ${to}`,
            },
            HttpStatus.BAD_REQUEST,
        );
    }
}

export class DriverNotAssignedException extends HttpException {
    constructor() {
        super(
            {
                status: 'failed',
                message: 'Driver is not assigned to this trip',
            },
            HttpStatus.FORBIDDEN,
        );
    }
}

export class TripNotBookableException extends HttpException {
    constructor(reason?: string) {
        super(
            {
                status: 'failed',
                message:
                    reason || 'Trip is not available for booking at this time',
            },
            HttpStatus.BAD_REQUEST,
        );
    }
}

export class TripStartWindowException extends HttpException {
    constructor(windowOpens: Date, windowCloses: Date) {
        super(
            {
                status: 'failed',
                message: `Trip can only be started between ${windowOpens.toISOString()} and ${windowCloses.toISOString()}`,
            },
            HttpStatus.BAD_REQUEST,
        );
    }
}

export class InvalidTripStateException extends HttpException {
    constructor(message: string) {
        super(
            {
                status: 'failed',
                message,
            },
            HttpStatus.BAD_REQUEST,
        );
    }
}

export class InvalidBoardingTokenException extends HttpException {
    constructor(reason?: string) {
        super(
            {
                status: 'failed',
                message: reason || 'Invalid boarding token format',
            },
            HttpStatus.BAD_REQUEST,
        );
    }
}
