import { HttpException, HttpStatus } from '@nestjs/common';

export class TransactionWithReferenceNotFoundException extends HttpException {
    constructor(reference: string) {
        super(
            {
                status: 'failed',
                message: `Transaction with reference ${reference} not found`,
            },
            HttpStatus.NOT_FOUND,
        );
    }
}

export class TransactionWithIdNotFoundException extends HttpException {
    constructor(id: string) {
        super(
            {
                status: 'failed',
                message: `Transaction with ID ${id} not found`,
            },
            HttpStatus.NOT_FOUND,
        );
    }
}