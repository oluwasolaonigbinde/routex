import { HttpException, HttpStatus } from '@nestjs/common';

export class BookingNotFoundException extends HttpException {
    constructor(bookingId?: string) {
        super(
            {
                status: 'failed',
                message: bookingId
                    ? `Booking with ID ${bookingId} not found`
                    : 'Booking not found',
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

export class InsufficientSeatsException extends HttpException {
    constructor(available: number, requested: number) {
        super(
            {
                status: 'failed',
                message: `Insufficient seats available. Available: ${available}, Requested: ${requested}`,
            },
            HttpStatus.BAD_REQUEST,
        );
    }
}

export class BookingAlreadyCancelledException extends HttpException {
    constructor(bookingId: string) {
        super(
            {
                status: 'failed',
                message: `Booking with ID ${bookingId} has already been cancelled`,
            },
            HttpStatus.BAD_REQUEST,
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

export class TripAlreadyStartedException extends HttpException {
    constructor() {
        super(
            {
                status: 'failed',
                message: 'Trip has already started or completed',
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

export class PaymentVerificationFailedException extends HttpException {
    constructor(reason?: string) {
        super(
            {
                status: 'failed',
                message: reason || 'Payment verification failed',
            },
            HttpStatus.PAYMENT_REQUIRED,
        );
    }
}

export class UnauthorizedBookingAccessException extends HttpException {
    constructor() {
        super(
            {
                status: 'failed',
                message: 'You are not authorized to access this booking',
            },
            HttpStatus.FORBIDDEN,
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

export class RouteNotFoundException extends HttpException {
    constructor(routeId?: string) {
        super(
            {
                status: 'failed',
                message: routeId
                    ? `Route with ID ${routeId} not found`
                    : 'Route not found',
            },
            HttpStatus.NOT_FOUND,
        );
    }
}

export class VehicleNotFoundException extends HttpException {
    constructor(vehicleId?: string) {
        super(
            {
                status: 'failed',
                message: vehicleId
                    ? `Vehicle with ID ${vehicleId} not found`
                    : 'Vehicle not found',
            },
            HttpStatus.NOT_FOUND,
        );
    }
}

export class LocationNotFoundException extends HttpException {
    constructor(locationId?: string) {
        super(
            {
                status: 'failed',
                message: locationId
                    ? `Location with ID ${locationId} not found`
                    : 'Location not found',
            },
            HttpStatus.NOT_FOUND,
        );
    }
}

export class BookingCancellationNotAllowedException extends HttpException {
    constructor(reason?: string) {
        super(
            {
                status: 'failed',
                message: reason || 'Booking cannot be cancelled at this time',
            },
            HttpStatus.BAD_REQUEST,
        );
    }
}

export class ScheduleNotAvailableForDateException extends HttpException {
    constructor(scheduleId: string, date: string) {
        super(
            {
                status: 'failed',
                message: `Schedule ${scheduleId} is not available for date ${date}. The date may fall outside the schedule's active range or does not match its recurrence pattern.`,
            },
            HttpStatus.BAD_REQUEST,
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

export class InvalidStopException extends HttpException {
    constructor(stopId: string, reason: string) {
        super(
            {
                status: 'failed',
                message: `Invalid stop ${stopId}: ${reason}`,
            },
            HttpStatus.BAD_REQUEST,
        );
    }
}
