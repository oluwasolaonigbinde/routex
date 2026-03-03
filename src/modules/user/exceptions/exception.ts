import { HttpException, HttpStatus } from '@nestjs/common';

export class EmergencyContactNotFoundException extends HttpException {
    constructor(id: string) {
        super(
            {
                status: 'failed',
                message: `Emergency contact with ID ${id} not found`,
            },
            HttpStatus.NOT_FOUND,
        );
    }
}

export class FavoriteRouteNotFoundException extends HttpException {
    constructor(routeId: string) {
        super(
            {
                status: 'failed',
                message: `Route with ID ${routeId} is not in your favorites`,
            },
            HttpStatus.NOT_FOUND,
        );
    }
}

export class FavoriteRouteAlreadyExistsException extends HttpException {
    constructor(routeId: string) {
        super(
            {
                status: 'failed',
                message: `Route with ID ${routeId} is already in your favorites`,
            },
            HttpStatus.CONFLICT,
        );
    }
}
