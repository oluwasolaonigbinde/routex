import {
    BadRequestException,
    Injectable,
    Logger,
    NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac } from 'crypto';
import axios, { AxiosInstance } from 'axios';
import { DatabaseService } from '@/modules/database/database.service';
import { PaymentVerificationFailedException } from '@/modules/booking/exceptions/booking.exception';
import { v4 as uuidv4 } from 'uuid';
import { TransactionIntentsToEventMap } from '@/modules/payment/transaction-intent';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Prisma, TransactionSource, TransactionStatus } from '@prisma/client';
import { TransactionWithIdNotFoundException } from '@/modules/payment/exception/transaction';
import {
    CardNotFoundException,
    CardNotReusableException,
    CardRequiredForPaymentException,
} from '@/modules/payment/exception/card';
import { convertTo2DecimalPlaces } from '@/util/util';
import {
    CreateTransactionDto,
    QueryTransactionsDto,
} from '@/modules/payment/dto/transaction';
import {
    PaymentChannel,
    PaystackPaymentChannels,
    PaystackWebhookRequest,
} from '@/modules/payment/types/payment';
import { Transaction } from '@/modules/payment/entities/transaction';
import {
    CardChannel,
    InstantTransferChannel,
    WalletChannel,
} from '@/modules/payment/entities/payment';

interface PaystackVerifyResponse {
    status: boolean;
    message: string;
    data: {
        reference: string;
        amount: number;
        status: 'success' | 'failed' | 'abandoned';
        paid_at: string;
        channel: string;
        customer: {
            email: string;
        };
    };
}

@Injectable()
export class PaymentService {
    private readonly logger = new Logger(PaymentService.name);
    private readonly paystackClient: AxiosInstance;
    private readonly paystackSecretKey: string;

    constructor(
        private readonly configService: ConfigService,
        private readonly db: DatabaseService,
        private readonly eventEmitter: EventEmitter2,
    ) {
        this.paystackSecretKey =
            this.configService.get<string>('PAYSTACK_SECRET_KEY') || '';

        this.paystackClient = axios.create({
            baseURL: 'https://api.paystack.co',
            headers: {
                Authorization: `Bearer ${this.paystackSecretKey}`,
                'Content-Type': 'application/json',
            },
        });
    }

    /**
     * Computes the gross charge amount C such that C - Fee(C) = N,
     * where N is the net amount to settle to the user's account.
     *
     * Paystack fee rules (local):
     *   - C < NGN 2,500 : Fee = 1.5%        (flat NGN 100 waived)
     *   - C ≥ NGN 2,500 : Fee = 1.5% + NGN 100 (capped at NGN 2,000)
     *
     * Paystack fee rules (international):
     *   - Fee = 3.9% + NGN 100 (no cap)
     *
     * @param netSettlement - Amount (in Naira) to settle to the user
     * @param isInternational - Whether the transaction is international (default: false)
     * @returns the fee (in Naira)
     */
    estimateTransactionFee(
        netSettlement: number,
        isInternational: boolean = false,
    ): number {
        let charge: number;

        if (isInternational) {
            // C * (1 - 0.039) - 100 = N  =>  C = (N + 100) / 0.961
            charge = (netSettlement + 100) / 0.961;
        } else {
            // Determine which fee band applies by first trying without the flat fee.
            // Threshold: when C < 2,500 the flat fee is waived, so N < 2,500 * 0.985 = 2,462.50
            const noFlatFeeThreshold = 2500 * (1 - 0.015); // 2,462.50

            // Threshold for the fee cap: cap kicks in at C > 126,666.67,
            // which corresponds to N > 126,666.67 - 2,000 = 124,666.67
            const capThreshold = (2000 - 100) / 0.015 - 2000; // 124,666.67

            if (netSettlement < noFlatFeeThreshold) {
                // Case 1: no flat fee  ->  C * 0.985 = N
                charge = netSettlement / 0.985;
            } else if (netSettlement <= capThreshold) {
                // Case 2: flat fee applies, not capped  ->  C * 0.985 - 100 = N
                charge = (netSettlement + 100) / 0.985;
            } else {
                // Case 3: fee is capped at NGN 2,000  ->  C - 2,000 = N
                charge = netSettlement + 2000;
            }
        }

        return charge - netSettlement;
    }

    private createReference(): string {
        return uuidv4();
    }

    async createTransaction(userId: string, transaction: CreateTransactionDto) {
        const reference = this.createReference();
        const { bank, ...rest } = transaction;

        if (bank) {
            const { accountName } = await this.resolveBankAccount(
                bank.accountNumber,
                bank.bankCode,
            );

            const createdBank = await this.db.bankAccount.create({
                data: {
                    ...bank,
                    accountName,
                    bankName: bank.bankCode,
                },
            });

            return await this.db.transaction.create({
                data: {
                    ...rest,
                    userId,
                    reference,
                    bankId: createdBank.id,
                },
            });
        }

        return await this.db.transaction.create({
            data: {
                ...rest,
                userId,
                reference,
            },
        });
    }

    async payWithWallet(transactionId: string): Promise<WalletChannel> {
        await this.eventEmitter.emitAsync('wallet.debit', {
            transactionId,
        });

        return {
            channel: 'wallet',
            status: 'success',
        };
    }

    async payWithCard(
        transactionId: string,
        cardId: string,
    ): Promise<CardChannel> {
        const paymentAttempt = await this.db.paymentAttempt.create({
            data: {
                transactionId: transactionId,
                gateway: 'paystack',
            },
            include: {
                transaction: true,
            },
        });

        const transaction = paymentAttempt.transaction;

        const card = await this.db.card.findUnique({
            where: { id: cardId },
        });

        if (!card) {
            throw new CardNotFoundException(cardId);
        }

        if (card.userId !== transaction.userId) {
            throw new CardNotFoundException(cardId);
        }

        if (!card.reusable) {
            throw new CardNotReusableException();
        }

        const fee = convertTo2DecimalPlaces(
            this.estimateTransactionFee(transaction.amount),
        );
        const net = convertTo2DecimalPlaces(transaction.amount);
        const gross = convertTo2DecimalPlaces(net + fee);

        const response = await this.paystackClient.post<{
            status: boolean;
            message: string;
            data: {
                reference: string;
                status: string;
                authorization_url?: string;
                paused?: boolean;
            };
        }>('/transaction/charge_authorization', {
            authorization_code: card.authorizationCode,
            email: card.email,
            amount: Math.round(gross * 100), // convert to kobo
            reference: transaction.reference,
            metadata: {
                paymentAttemptId: paymentAttempt.id,
            },
        });

        const data = response.data.data;

        // 2FA challenge — user needs to authorize via URL
        if (data.paused) {
            return {
                channel: 'card',
                status: 'processing',
                checkoutUrl: data.authorization_url || '',
                reference: transaction.reference,
                amount: gross,
                fee: fee,
                net: net,
                expiresIn: '1h',
            };
        }

        return {
            channel: 'card',
            status: 'processing',
            checkoutUrl: '',
            reference: transaction.reference,
            amount: gross,
            fee: fee,
            net: net,
            expiresIn: '1h',
        };
    }

    async payWithInstantTransfer(
        transactionId: string,
        channels?: PaystackPaymentChannels[],
    ): Promise<InstantTransferChannel> {
        const paymentAttempt = await this.db.paymentAttempt.create({
            data: {
                transactionId: transactionId,
                gateway: 'paystack',
            },
            include: {
                transaction: {
                    include: {
                        user: true,
                    },
                },
            },
        });

        const transaction = paymentAttempt.transaction;

        const fee = convertTo2DecimalPlaces(
            this.estimateTransactionFee(transaction.amount),
        );
        const net = convertTo2DecimalPlaces(transaction.amount);
        const gross = convertTo2DecimalPlaces(net + fee);

        const virtualAccount = await this.paystackClient.post<{
            status: string;
            message: string;
            data: {
                authorization_url: string;
                access_code: string;
                reference: string;
            };
        }>('/transaction/initialize', {
            email: transaction.user.email,
            amount: Math.round(gross * 100), // convert to kobo
            reference: transaction.reference,
            metadata: {
                paymentAttemptId: paymentAttempt.id,
            },
            ...(channels && channels.length > 0 ? { channels } : undefined),
        });

        return {
            checkoutUrl: virtualAccount.data.data.authorization_url,
            expiresIn: '1h',
            amount: gross,
            fee: fee,
            net: net,
            reference: transaction.reference,
            channel: 'instant_transfer',
            status: 'processing',
        };
    }

    async acceptPayment(params: {
        transactionId: string;
        source?: typeof TransactionSource.WALLET;
    }): Promise<WalletChannel>;
    async acceptPayment(params: {
        transactionId: string;
        source?: typeof TransactionSource.CARD;
        cardId?: string;
    }): Promise<CardChannel>;
    async acceptPayment(params: {
        transactionId: string;
        source?: typeof TransactionSource.INSTANT_TRANSFER;
        channels?: PaystackPaymentChannels[];
    }): Promise<InstantTransferChannel>;
    async acceptPayment(params: {
        transactionId: string;
        source?: TransactionSource;
        cardId?: string;
        channels?: PaystackPaymentChannels[];
    }): Promise<PaymentChannel>;
    async acceptPayment({
        transactionId,
        source: _source,
        cardId,
        channels,
    }: {
        transactionId: string;
        source?: TransactionSource;
        cardId?: string;
        channels?: PaystackPaymentChannels[];
    }): Promise<PaymentChannel> {
        const transaction = await this.db.transaction.findUnique({
            where: { id: transactionId },
        });

        if (!transaction) {
            throw new TransactionWithIdNotFoundException(transactionId);
        }

        if (
            transaction.status === TransactionStatus.SUCCESS ||
            transaction.status === TransactionStatus.FAILED
        ) {
            throw new BadRequestException(
                'Transaction can no longer be accepted. It is already in a terminal state.',
            );
        }

        if (_source) {
            await this.db.transaction.update({
                where: { id: transactionId },
                data: { source: _source },
            });
        }

        const source = _source || transaction.source;

        if (source === TransactionSource.WALLET) {
            return await this.payWithWallet(transactionId);
        } else if (source === TransactionSource.CARD) {
            if (!cardId) {
                throw new CardRequiredForPaymentException();
            }
            return this.payWithCard(transactionId, cardId);
        } else if (source === TransactionSource.INSTANT_TRANSFER) {
            return this.payWithInstantTransfer(transactionId, channels);
        } else {
            throw new BadRequestException('Unsupported transaction source');
        }
    }

    async resolveBankAccount(
        accountNumber: string,
        bankCode: string,
    ): Promise<{ accountName: string; accountNumber: string }> {
        try {
            const response = await this.paystackClient.get<{
                status: boolean;
                message: string;
                data: {
                    account_number: string;
                    account_name: string;
                    bank_id: number;
                };
            }>(`/bank/resolve`, {
                params: {
                    account_number: accountNumber,
                    bank_code: bankCode,
                },
            });

            return {
                accountName: response.data.data.account_name,
                accountNumber: response.data.data.account_number,
            };
        } catch {
            throw new BadRequestException('Unable to resolve bank account');
        }
    }

    async createTransferRecipient({
        accountNumber,
        bankCode,
        name,
    }: {
        accountNumber: string;
        bankCode: string;
        name: string;
    }): Promise<{ recipientCode: string }> {
        const recipient = await this.paystackClient.post<{
            status: boolean;
            message: string;
            data: {
                recipient_code: string;
                name: string;
                type: string;
            };
        }>(`/transferrecipient`, {
            type: 'nuban',
            name: name,
            account_number: accountNumber,
            bank_code: bankCode,
            currency: 'NGN',
        });

        return { recipientCode: recipient.data.data.recipient_code };
    }

    async initiateTransfer({
        recipientCode,
        amount,
        reason,
        reference,
    }: {
        recipientCode: string;
        amount: number;
        reason: string;
        reference: string;
    }): Promise<void> {
        try {
            await this.paystackClient.post<{
                status: boolean;
                message: string;
                data: {
                    transfer_code: string;
                    amount: number;
                    currency: string;
                    status: string;
                };
            }>(`/transfer`, {
                source: 'balance',
                amount: amount * 100,
                recipient: recipientCode,
                reason: reason,
                reference: reference,
            });
        } catch (error) {
            this.logger.log('error', error);
            throw error;
        }
    }

    async transferToBankAccount(
        transaction: Prisma.TransactionGetPayload<{
            include: { bank: true };
        }>,
    ) {
        const bank = transaction.bank;

        if (!bank) throw new NotFoundException('Bank account not found');

        const recipientCode = (
            await this.createTransferRecipient({
                accountNumber: bank.accountNumber,
                bankCode: bank.bankCode,
                name: bank.accountName,
            })
        ).recipientCode;

        await this.initiateTransfer({
            recipientCode,
            amount: transaction.amount,
            reason: '',
            // reason: `Transfer for transaction ${transaction.id}`,
            reference: transaction.reference,
        });
    }

    transferToWallet(transaction: Transaction) {
        this.eventEmitter.emit('wallet.credit', {
            transactionId: transaction.id,
        });
    }

    async transferFunds({
        transactionId,
    }: {
        transactionId: string;
        reason?: string;
    }) {
        const transaction = await this.db.transaction.findUnique({
            where: { id: transactionId },
            include: { bank: true },
        });

        if (!transaction) {
            throw new TransactionWithIdNotFoundException(transactionId);
        }

        if (
            transaction.status === TransactionStatus.SUCCESS ||
            transaction.status === TransactionStatus.FAILED
        ) {
            throw new BadRequestException(
                'Transaction can no longer be accepted. It is already in a terminal state.',
            );
        }

        if (transaction.destination === 'BANK_ACCOUNT') {
            await this.transferToBankAccount(transaction);
        } else if (transaction.destination === 'WALLET') {
            this.transferToWallet(transaction);
        } else {
            throw new BadRequestException(
                'Unsupported transaction destination',
            );
        }
    }

    /**
     * Verify a Paystack transaction
     * @param reference - Payment reference
     * @returns Verification result
     */
    async verifyTransaction(reference: string): Promise<{
        success: boolean;
        amount: number;
        paidAt: Date;
        channel: string;
    }> {
        try {
            this.logger.log(`Verifying Paystack transaction: ${reference}`);

            const response =
                await this.paystackClient.get<PaystackVerifyResponse>(
                    `/transaction/verify/${reference}`,
                );

            if (!response.data.status) {
                throw new Error(response.data.message);
            }

            const { data } = response.data;

            return {
                success: data.status === 'success',
                amount: data.amount,
                paidAt: new Date(data.paid_at),
                channel: data.channel,
            };
        } catch (error: unknown) {
            if (error instanceof Error) {
                this.logger.error(
                    `Failed to verify payment: ${error.message}`,
                    error.stack,
                );
            } else {
                this.logger.error(`Failed to verify payment: ${String(error)}`);
            }

            throw new PaymentVerificationFailedException(
                'Failed to verify payment',
            );
        }
    }

    /**
     * Validate Paystack webhook signature
     * @param signature - X-Paystack-Signature header
     * @param body - Raw request body
     * @returns True if signature is valid
     */
    validateWebhookSignature(signature: string, body: string): boolean {
        const hash = createHmac('sha512', this.paystackSecretKey)
            .update(body)
            .digest('hex');

        return hash === signature;
    }

    /**
     * Process a refund (Note: Paystack requires manual processing via dashboard)
     * @param reference - Original payment reference
     * @returns Refund initiation result
     */
    processRefund(reference: string): { initiated: boolean } {
        // Note: Paystack doesn't have automated refund API
        // Refunds must be processed manually via dashboard
        // This method logs the refund request for manual processing

        this.logger.warn(
            `Refund requested for transaction ${reference}. Manual processing required via Paystack dashboard.`,
        );

        // In production, you might want to:
        // 1. Create a refund request record in database
        // 2. Send notification to admin
        // 3. Integrate with Paystack's refund API when available

        return { initiated: true };
    }

    /**
     * Handle the final processing result for a transaction that was submitted
     * to an asynchronous payment gateway.
     *
     * This method is intended to be called by gateway callbacks or background
     * processors when a transaction has been settled (success) or failed.
     *
     * Behaviour and side-effects:
     * - Loads the transaction by `reference` and validates it is not already
     *   in a terminal state.
     * - Updates any associated `PaymentAttempt` record (if `gateway.paymentAttemptId` is provided).
     * - Updates the `Transaction` row with gateway metadata (gateway id, gatewayFee,
     *   gross amount) and sets `succeededAt` or `failedAt` depending on `status`.
     * - Emits an event based on the transaction `intent` (see `{@link TransactionIntentsToEventMap}`).
     *
     * @throws {NotFoundException} when the transaction reference cannot be found.
     * @throws {BadRequestException} when the transaction is already in a terminal state.
     *
     * @param reference - The unique transaction reference generated at creation time
     * @param status - Final status reported by the gateway: `'SUCCESS'` or `'FAILED'`
     * @param source - The `TransactionSource` that initiated the transaction (wallet, card, instant_transfer)
     * @param gateway - Optional gateway details including `gateway` name, `gatewayFee`,
     *                  and an optional `paymentAttemptId` used to correlate gateway attempts
     * @param approvedById - Optional user id who approved the transaction (admin flows)
     */
    async handleTransactionProcessed(
        reference: string,
        status: 'SUCCESS' | 'FAILED',
        source?: TransactionSource,
        gateway?: PaystackWebhookRequest,
        approvedById?: string,
    ) {
        const tx = await this.db.transaction.findUnique({
            where: { reference },
        });

        if (!tx) {
            this.logger.error(
                `Transaction with reference ${reference} not found`,
            );
            return;
        }

        // check if transaction is in a terminal state
        if (tx.status === 'SUCCESS' || tx.status === 'FAILED') {
            this.logger.warn(
                `Transaction with reference ${reference} is already in terminal state ${tx.status}`,
            );
            return;
        }

        const paymentAttemptId = (
            gateway?.data.metadata as { paymentAttemptId?: string }
        )?.paymentAttemptId;

        if (paymentAttemptId) {
            await this.db.paymentAttempt.update({
                where: { id: paymentAttemptId },
                data: {
                    status: status === 'SUCCESS' ? 'SUCCESS' : 'FAILED',
                    responsePayload: gateway,
                },
            });
        }

        const fees = (gateway?.data.fees || 0) / 100;

        // mark transaction state
        await this.db.transaction.update({
            where: { reference },
            data: {
                status: status,
                gateway: 'PAYSTACK',
                gatewayFee: fees,
                gross: tx.amount + (fees || 0),
                ...(source && { source: source }),
                ...(status === 'SUCCESS' && { succeededAt: new Date() }),
                ...(status === 'FAILED' && { failedAt: new Date() }),
                approvedById: approvedById,
            },
        });

        // emit event based on transaction intent
        const eventName = TransactionIntentsToEventMap[tx.intent];
        if (eventName) {
            this.eventEmitter.emit(eventName, {
                transactionId: tx.id,
                paymentAttemptId,
            });
        }
    }

    /**
     * Get paginated list of transactions
     */
    async getTransactions(query: QueryTransactionsDto) {
        const { page, limit, ...filter } = query;
        const skip = (page - 1) * limit;

        const where: Prisma.TransactionWhereInput = {
            ...filter,
            status: {
                notIn: ['PENDING'],
            },
        };

        const [transactions, totalCount] = await Promise.all([
            this.db.transaction.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
            }),
            this.db.transaction.count({ where }),
        ]);

        return {
            totalCount,
            page,
            limit,
            results: transactions,
            perPage: transactions.length,
        };
    }
}
