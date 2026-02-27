import { HttpException, HttpStatus } from '@nestjs/common';

export class InsufficientWalletBalanceException extends HttpException {
    constructor(balance: number, required: number) {
        super(
            {
                status: 'failed',
                message: `Insufficient wallet balance. Available: ₦${balance.toFixed(2)}, Required: ₦${required.toFixed(2)}`,
            },
            HttpStatus.BAD_REQUEST,
        );
    }
}

export class WalletTopupNotFoundException extends HttpException {
    constructor(reference?: string) {
        super(
            {
                status: 'failed',
                message: reference
                    ? `Wallet top-up with reference ${reference} not found`
                    : 'Wallet top-up not found',
            },
            HttpStatus.NOT_FOUND,
        );
    }
}

export class TransactionAlreadyProcessedException extends HttpException {
    constructor(transactionId: string) {
        super(
            {
                status: 'failed',
                message: `Transaction with transactionId ${transactionId} has already been processed`,
            },
            HttpStatus.CONFLICT,
        );
    }
}
