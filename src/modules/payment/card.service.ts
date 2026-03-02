import { DatabaseService } from '@/modules/database/database.service';
import { CardNotFoundException } from '@/modules/payment/exception/card';
import { PaymentService } from '@/modules/payment/payment.service';
import { TransactionIntentsToEventMap } from '@/modules/payment/transaction-intent';
import { PaystackWebhookRequest } from '@/modules/payment/types/payment';
import { PaginatedResponse } from '@/types';
import { PaginatedQuery } from '@/util/dto';
import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { Card, Prisma } from '@prisma/client';

@Injectable()
export class CardService {
    private readonly logger = new Logger(CardService.name);
    constructor(
        private readonly db: DatabaseService,
        private readonly paymentService: PaymentService,
        private readonly eventEmitter: EventEmitter2,
    ) {}

    async addCard(userId: string) {
        const transaction = await this.paymentService.createTransaction(
            userId,
            {
                amount: 10, // Nominal amount for adding a card (can be refunded later)
                description: `Authorization hold of ${10} for adding card`,
                intent: 'ADD_CARD',
                type: 'DEBIT',
                bookingId: null,
                source: 'CARD',
                destination: 'PLATFORM',
            },
        );

        return this.paymentService.acceptPayment({
            transactionId: transaction.id,
            channels: ['card'],
            source: 'INSTANT_TRANSFER',
        });
    }

    @OnEvent(TransactionIntentsToEventMap.ADD_CARD)
    async handleCardAdded({
        transactionId,
        paymentAttemptId,
    }: {
        transactionId: string;
        paymentAttemptId?: string;
    }) {
        try {
            // Resolve userId from transaction reference
            const transaction = await this.db.transaction.findUnique({
                where: { id: transactionId },
            });

            if (!transaction) {
                this.logger.warn(
                    `Cannot save card: transaction with transaction id ${transactionId} not found`,
                );
                return;
            }

            const paymentAttempt = await this.db.paymentAttempt.findUnique({
                where: { id: paymentAttemptId },
            });

            if (!paymentAttempt) {
                this.logger.warn(
                    `Cannot save card: payment attempt with id ${paymentAttemptId} not found`,
                );
                return;
            }

            const responsePayload =
                paymentAttempt.responsePayload as PaystackWebhookRequest;
            const authorization = responsePayload.data.authorization;
            const customerEmail = responsePayload.data.customer.email;

            // Upsert card keyed by (userId, signature) to prevent duplicates
            await this.db.card.upsert({
                where: {
                    userId_signature: {
                        userId: transaction.userId,
                        signature: authorization.signature,
                    },
                },
                update: {
                    authorizationCode: authorization.authorization_code,
                    expMonth: authorization.exp_month,
                    expYear: authorization.exp_year,
                    isDefault: true,
                    deletedAt: null,
                },
                create: {
                    userId: transaction.userId,
                    authorizationCode: authorization.authorization_code,
                    cardType: authorization.card_type,
                    last4: authorization.last4,
                    expMonth: authorization.exp_month,
                    expYear: authorization.exp_year,
                    bin: authorization.bin,
                    bank: authorization.bank,
                    channel: authorization.channel,
                    signature: authorization.signature,
                    countryCode: authorization.country_code,
                    accountName: authorization.account_name,
                    reusable: authorization.reusable,
                    email: customerEmail,
                },
            });

            // TODO: use the refund api if the authorization resusable is false,

            const newTransaction = await this.paymentService.createTransaction(
                transaction.userId,
                {
                    amount: transaction.amount,
                    description: `Authorization hold of ${transaction.amount} for card ending ${authorization.last4} has been credited to the wallet balance`,
                    destination: 'WALLET',
                    source: 'PLATFORM',
                    intent: 'WALLET_TOPUP',
                    type: 'CREDIT',
                    bookingId: null,
                },
            );

            this.eventEmitter.emit('wallet.credit', {
                transactionId: newTransaction.id,
            });

            this.logger.log(
                `Saved card authorization for user ${transaction.userId} (${authorization.card_type} ending ${authorization.last4})`,
            );
        } catch (error) {
            this.logger.error('Failed to save card authorization', error);
        }
    }

    /**
     * Get all saved cards for a user
     */
    async getUserCards(
        userId: string,
        query: PaginatedQuery,
    ): Promise<PaginatedResponse<Card>['data']> {
        const { page, limit } = query;
        const skip = (page - 1) * limit;

        const where: Prisma.CardWhereInput = {
            userId,
            deletedAt: null,
        };

        const [cards, totalCount] = await Promise.all([
            this.db.card.findMany({
                where,
                skip,
                take: limit,
                orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
            }),
            this.db.card.count({ where }),
        ]);

        return {
            totalCount,
            page,
            limit,
            results: cards,
            perPage: cards.length,
        };
    }

    /**
     * Delete a saved card
     */
    async deleteCard(userId: string, cardId: string) {
        const card = await this.db.card.findUnique({
            where: { id: cardId },
        });

        if (!card || card.userId !== userId) {
            throw new CardNotFoundException(cardId);
        }

        await this.db.card.update({
            where: { id: cardId },
            data: { deletedAt: new Date(), isDefault: false },
        });

        // If the deleted card was the default, promote the most recently added card
        if (card.isDefault) {
            const next = await this.db.card.findFirst({
                where: { userId, deletedAt: null },
                orderBy: { createdAt: 'desc' },
            });

            if (next) {
                await this.db.card.update({
                    where: { id: next.id },
                    data: { isDefault: true },
                });
            }
        }
    }

    /**
     * Set a card as the default payment method
     */
    async setDefaultCard(userId: string, cardId: string) {
        const card = await this.db.card.findUnique({
            where: { id: cardId },
        });

        if (!card || card.userId !== userId) {
            throw new CardNotFoundException(cardId);
        }

        // Unset all other defaults, then set the new one
        await this.db.$transaction([
            this.db.card.updateMany({
                where: { userId, isDefault: true, deletedAt: null },
                data: { isDefault: false },
            }),
            this.db.card.update({
                where: { id: cardId, deletedAt: null },
                data: { isDefault: true },
            }),
        ]);

        return this.db.card.findUniqueOrThrow({
            where: { id: cardId, deletedAt: null },
        });
    }
}
