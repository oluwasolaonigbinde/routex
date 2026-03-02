import { HttpException, HttpStatus } from '@nestjs/common';

export class CardNotFoundException extends HttpException {
    constructor(id: string) {
        super(
            {
                status: 'failed',
                message: `Card with ID ${id} not found`,
            },
            HttpStatus.NOT_FOUND,
        );
    }
}

export class CardNotReusableException extends HttpException {
    constructor() {
        super(
            {
                status: 'failed',
                message:
                    'This card authorization is not reusable for recurring charges',
            },
            HttpStatus.BAD_REQUEST,
        );
    }
}

export class CardRequiredForPaymentException extends HttpException {
    constructor() {
        super(
            {
                status: 'failed',
                message:
                    'A cardId is required when using CARD as the payment method',
            },
            HttpStatus.BAD_REQUEST,
        );
    }
}
