import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { Wallet, TransactionStatus } from '@prisma/client';
import { DatabaseService } from '@/modules/database/database.service';
import { InsufficientWalletBalanceException } from '@/modules/wallet/exceptions/wallet.exception';
import { WalletFundedEvent } from '@/modules/wallet/events/wallet.events';
import { PaymentService } from '@/modules/payment/payment.service';
import { FundWalletDto } from '@/modules/wallet/dto/wallet.dto';
import { TransactionIntentsToEventMap } from '@/modules/payment/transaction-intent';
import { InstantTransferChannel } from '@/modules/payment/entities/payment';

@Injectable()
export class WalletService {
    private readonly logger = new Logger(WalletService.name);

    constructor(
        private readonly db: DatabaseService,
        private readonly paymentService: PaymentService,
        private readonly eventEmitter: EventEmitter2,
    ) {}

    /**
     * Get an existing wallet or create one for the user (lazy creation)
     */
    async getOrCreateWallet(userId: string): Promise<Wallet> {
        const existing = await this.db.wallet.findUnique({
            where: { userId },
        });

        if (existing) return existing;

        return this.db.wallet.create({
            data: { userId },
        });
    }

    /**
     * Get wallet for a user (creates one if it doesn't exist)
     */
    async getWallet(userId: string): Promise<Wallet> {
        return this.getOrCreateWallet(userId);
    }

    /**
     * Initialize a wallet top-up.
     * Creates a PENDING Transaction and returns the Paystack payment URL.
     */
    async initiateWalletTopUp(
        userId: string,
        fundWalletDto: FundWalletDto,
    ): Promise<InstantTransferChannel> {
        const transaction = await this.paymentService.createTransaction(
            userId,
            {
                amount: fundWalletDto.amount,
                description: 'Wallet top up',
                intent: 'WALLET_TOPUP',
                type: 'CREDIT',
                bookingId: null,
                source: 'INSTANT_TRANSFER',
                destination: 'PLATFORM',
            },
        );

        const payment = await this.paymentService.acceptPayment({
            source: 'INSTANT_TRANSFER',
            transactionId: transaction.id,
        });

        return payment;
    }

    @OnEvent(TransactionIntentsToEventMap.WALLET_TOPUP, { async: true })
    async confirmTopup({
        transactionId,
    }: {
        transactionId: string;
    }): Promise<void> {
        this.logger.log(`Confirming wallet top-up: ${transactionId}`);

        const transaction = await this.db.transaction.findUniqueOrThrow({
            where: { id: transactionId },
        });

        if (transaction.status !== TransactionStatus.SUCCESS) {
            this.logger.warn(`Transaction ${transactionId} is not successful`);
            return;
        }

        const wallet = await this.getWallet(transaction.userId);

        // Atomically update wallet balance
        const [updatedWallet] = await this.db.$transaction(async (tx) => {
            const updatedWallet = await tx.wallet.upsert({
                where: { id: wallet.id },
                update: { balance: { increment: transaction.amount } },
                create: {
                    balance: transaction.amount,
                    userId: transaction.userId,
                },
            });

            // const updatedTransaction = await tx.transaction.update({
            //     where: { reference },
            //     data: {
            //         status: TransactionStatus.SUCCESS,
            //         balance: wallet.balance, // final balance after credit
            //     },
            // });

            return [updatedWallet] as const;
        });

        this.eventEmitter.emit(
            'wallet.funded',
            new WalletFundedEvent(
                transaction.userId,
                transaction.amount,
                updatedWallet.balance,
                transaction.id,
            ),
        );

        this.logger.log(
            `Wallet funded: user ${transaction.userId}, amount ${transaction.amount}, new balance ${updatedWallet.balance}`,
        );
    }

    @OnEvent('wallet.debit')
    async debitWallet({ transactionId }: { transactionId: string }) {
        this.logger.log(`Debiting wallet for transaction ${transactionId}`);

        const transaction = await this.db.transaction.findUniqueOrThrow({
            where: { id: transactionId },
        });

        const wallet = await this.getWallet(transaction.userId);

        if (!wallet) {
            throw new BadRequestException(
                'Transaction not associated with a wallet',
            );
        }

        if (wallet.balance < transaction.amount) {
            throw new InsufficientWalletBalanceException(
                wallet.balance,
                transaction.amount,
            );
        }

        await this.db.wallet.update({
            where: { id: wallet.id },
            data: { balance: { decrement: transaction.amount } },
        });

        await this.paymentService.handleTransactionProcessed(
            transaction.reference,
            'SUCCESS',
        );
    }

    @OnEvent('wallet.credit')
    async creditWallet({ transactionId }: { transactionId: string }) {
        this.logger.log(`Crediting wallet for transaction ${transactionId}`);

        const transaction = await this.db.transaction.findUniqueOrThrow({
            where: { id: transactionId },
        });

        const wallet = await this.getWallet(transaction.userId);

        if (!wallet) {
            throw new BadRequestException(
                'Transaction not associated with a wallet',
            );
        }

        await this.db.wallet.update({
            where: { id: wallet.id },
            data: { balance: { increment: transaction.amount } },
        });

        await this.paymentService.handleTransactionProcessed(
            transaction.reference,
            'SUCCESS',
        );
    }
}
