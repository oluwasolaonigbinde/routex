import { TransactionIntent } from '@prisma/client';

export const TransactionIntentsToEventMap: Record<TransactionIntent, string> = {
    WALLET_TOPUP: 'wallet.topup',
    BOOKING_PAYMENT: 'booking.payment',
    BOOKING_CANCELLATION_FEE: 'booking.cancellation_fee',
};
