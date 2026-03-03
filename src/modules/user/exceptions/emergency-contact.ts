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
