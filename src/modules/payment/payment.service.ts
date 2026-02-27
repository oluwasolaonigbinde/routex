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
import {
    Prisma,
    TransactionSource,
    TransactionStatus,
    TransactionType,
} from '@prisma/client';
import { TransactionWithIdNotFoundException } from '@/modules/payment/exception/transaction';
import { convertTo2DecimalPlaces } from '@/util/util';
import {
    CreateTransactionDto,
    QueryTransactionsDto,
} from '@/modules/payment/dto/transaction';
import {
    CardChannel,
    InstantTransferChannel,
    PaymentChannel,
    WalletChannel,
} from '@/modules/payment/types/payment';

interface PaystackInitializeResponse {
    status: boolean;
    message: string;
    data: {
        authorization_url: string;
        access_code: string;
        reference: string;
    };
}

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

        console.log('klds', Math.round(charge * 100) / 100);

        return charge - netSettlement;
    }

    private createReference(): string {
        return uuidv4();
    }

    async createTransaction(userId: string, transaction: CreateTransactionDto) {
        const reference = this.createReference();

        return await this.db.transaction.create({
            data: {
                ...transaction,
                userId,
                reference: reference,
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

    async payWithCard(transactionId: string): Promise<CardChannel> {
        return Promise.resolve({
            channel: 'card',
            status: 'processing',
        });
    }

    async payWithInstantTransfer(
        transactionId: string,
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
            amount: Math.round(gross * 100),
            reference: transaction.reference,
            metadata: {
                paymentAttemptId: paymentAttempt.id,
            },
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
        source: typeof TransactionSource.WALLET;
    }): Promise<WalletChannel>;
    async acceptPayment(params: {
        transactionId: string;
        source: typeof TransactionSource.CARD;
    }): Promise<CardChannel>;
    async acceptPayment(params: {
        transactionId: string;
        source: typeof TransactionSource.INSTANT_TRANSFER;
    }): Promise<InstantTransferChannel>;
    async acceptPayment(params: {
        transactionId: string;
        source: TransactionSource;
    }): Promise<PaymentChannel>;
    async acceptPayment({
        transactionId,
        source,
    }: {
        transactionId: string;
        source: TransactionSource;
    }): Promise<PaymentChannel> {
        const transaction = await this.db.transaction.findUnique({
            where: { id: transactionId },
        });

        if (!transaction) {
            throw new TransactionWithIdNotFoundException(transactionId);
        }

        if (transaction.type !== TransactionType.CREDIT) {
            throw new BadRequestException(
                'Only credit transactions can be accepted',
            );
        }

        if (
            transaction.status === TransactionStatus.SUCCESS ||
            transaction.status === TransactionStatus.FAILED
        ) {
            throw new BadRequestException(
                'Transaction can no longer be accepted. It is already in a terminal state.',
            );
        }

        if (source === TransactionSource.WALLET) {
            return await this.payWithWallet(transactionId);
        } else if (source === TransactionSource.CARD) {
            return this.payWithCard(transactionId);
        } else if (source === TransactionSource.INSTANT_TRANSFER) {
            return this.payWithInstantTransfer(transactionId);
        } else {
            throw new BadRequestException('Unsupported transaction source');
        }
    }

    // async transferFunds({
    //     transactionId,
    //     reason,
    // }: {
    //     transactionId: string;
    //     reason: string;
    // }) {
    //     const transaction = await this.db.transaction.findUnique({
    //         where: { id: transactionId },
    //     });

    //     if (!transaction) {
    //         throw new TransactionWithIdNotFoundException(transactionId);
    //     }

    //     if (transaction.type !== TransactionType.DEBIT) {
    //         throw new BadRequestException(
    //             'Only debit transactions can be transferred',
    //         );
    //     }

    //     if (
    //         transaction.status === TransactionStatus.SUCCESS ||
    //         transaction.status === TransactionStatus.FAILED
    //     ) {
    //         throw new BadRequestException(
    //             'Transaction can no longer be accepted. It is already in a terminal state.',
    //         );
    //     }

    //     if (!transaction.bankAccountId) {
    //         throw new BadRequestException(
    //             'Transaction is missing bank account information',
    //         );
    //     }

    //     const bank = await this.databaseService.bankAccount.findUnique({
    //         where: { id: transaction.bankAccountId },
    //     });

    //     if (!bank) throw new NotFoundException('Bank account not found');

    //     const gateway = this.paymentsFactory.getGateway(this.gatewayType);

    //     let recipientCode = bank.paystackRecipientCode;

    //     if (!recipientCode) {
    //         recipientCode = (
    //             await this.createTransferRecipient({
    //                 accountNumber: bank.accountNumber,
    //                 bankCode: bank.bankCode,
    //                 name: bank.accountName,
    //             })
    //         ).recipientCode;

    //         await this.databaseService.bankAccount.update({
    //             where: { id: bank.id },
    //             data: { paystackRecipientCode: recipientCode },
    //         });
    //     }

    //     await gateway.initiateTransfer({
    //         amount: transaction.amount.toNumber(),
    //         reason: reason || '',
    //         recipientCode: recipientCode || '',
    //         reference: transaction.reference,
    //     });
    // }

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
        } catch (error) {
            this.logger.error(
                `Failed to verify payment: ${error.message}`,
                error.stack,
            );
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
    async processRefund(reference: string): Promise<{ initiated: boolean }> {
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

    async processTransaction(
        reference: string,
        status: 'SUCCESS' | 'FAILED',
        source: TransactionSource,
        gateway?: {
            gateway: string;
            gatewayFee: number;
            paymentAttemptId: string;
        },
        approvedById?: string,
    ) {
        const tx = await this.db.transaction.findUnique({
            where: { reference },
        });

        if (!tx) {
            throw new NotFoundException('Transaction not found');
        }

        // check if transaction is in a terminal state
        if (tx.status === 'SUCCESS' || tx.status === 'FAILED') {
            throw new BadRequestException(
                'Transaction can no longer be processed. It is already in a terminal state.',
            );
        }

        if (gateway?.paymentAttemptId) {
            await this.db.paymentAttempt.update({
                where: { id: gateway.paymentAttemptId },
                data: { status: status === 'SUCCESS' ? 'SUCCESS' : 'FAILED' },
            });
        }

        // mark transaction state
        await this.db.transaction.update({
            where: { reference },
            data: {
                status: status,
                gateway: gateway?.gateway,
                gatewayFee: gateway?.gatewayFee,
                gross: tx.amount + (gateway?.gatewayFee || 0),
                source: source,
                ...(status === 'SUCCESS' && { succeededAt: new Date() }),
                ...(status === 'FAILED' && { failedAt: new Date() }),
                approvedById: approvedById,
            },
        });

        // emit event based on transaction intent
        const eventName = TransactionIntentsToEventMap[tx.intent];
        if (eventName) {
            this.eventEmitter.emit(eventName, { transactionId: tx.id });
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
            status: TransactionStatus.SUCCESS,
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
