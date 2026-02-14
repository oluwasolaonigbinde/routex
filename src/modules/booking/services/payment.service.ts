import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac } from 'crypto';
import axios, { AxiosInstance } from 'axios';
import { PaymentVerificationFailedException } from '../exceptions/booking.exception';

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

    constructor(private readonly configService: ConfigService) {
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
     * Initialize a Paystack transaction
     * @param email - Customer email
     * @param amount - Amount in kobo (₦1 = 100 kobo)
     * @param reference - Unique payment reference
     * @param metadata - Additional metadata
     * @returns Payment URL and reference
     */
    async initializeTransaction(
        email: string,
        amount: number,
        reference: string,
        metadata?: Record<string, any>,
    ): Promise<{ authorizationUrl: string; reference: string }> {
        try {
            this.logger.log(
                `Initializing Paystack transaction for ${email}, amount: ${amount}`,
            );

            const response =
                await this.paystackClient.post<PaystackInitializeResponse>(
                    '/transaction/initialize',
                    {
                        email,
                        amount,
                        reference,
                        metadata,
                        callback_url: this.configService.get<string>(
                            'PAYSTACK_CALLBACK_URL',
                        ),
                    },
                );

            if (!response.data.status) {
                throw new Error(response.data.message);
            }

            return {
                authorizationUrl: response.data.data.authorization_url,
                reference: response.data.data.reference,
            };
        } catch (error) {
            this.logger.error(
                `Failed to initialize payment: ${error.message}`,
                error.stack,
            );
            throw new PaymentVerificationFailedException(
                'Failed to initialize payment',
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
}
