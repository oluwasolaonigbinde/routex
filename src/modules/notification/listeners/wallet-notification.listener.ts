import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import {
    WalletFundedEvent,
    WalletDebitedEvent,
} from '@/modules/wallet/events/wallet.events';
import { NotificationService } from '@/modules/notification/services/notification.service';
import { NotificationType } from '@/modules/notification/event/enum';

@Injectable()
export class WalletNotificationListener {
    private readonly logger = new Logger(WalletNotificationListener.name);

    constructor(private readonly notificationService: NotificationService) {}

    @OnEvent('wallet.funded', { async: true })
    async handleWalletFunded(event: WalletFundedEvent) {
        this.logger.log(
            `Handling wallet.funded event for user ${event.userId}`,
        );

        await this.notificationService.sendInAppNotification({
            userId: event.userId,
            type: NotificationType.WALLET_FUNDED,
            title: 'Wallet Funded',
            message: `Your wallet has been credited with ₦${event.amount}. New balance: ₦${event.newBalance}.`,
            tenant: 'USER',
            metadata: {
                amount: event.amount,
                newBalance: event.newBalance,
                transactionId: event.transactionId,
            },
        });
    }

    @OnEvent('wallet.debited', { async: true })
    async handleWalletDebited(event: WalletDebitedEvent) {
        this.logger.log(
            `Handling wallet.debited event for user ${event.userId}`,
        );

        await this.notificationService.sendInAppNotification({
            userId: event.userId,
            type: NotificationType.WALLET_DEBITED,
            title: 'Booking Payment',
            message: `₦${event.amount} has been deducted from your wallet for your booking. Remaining balance: ₦${event.newBalance}.`,
            tenant: 'USER',
            metadata: {
                amount: event.amount,
                newBalance: event.newBalance,
                bookingId: event.bookingId,
                reference: event.reference,
            },
        });
    }
}
