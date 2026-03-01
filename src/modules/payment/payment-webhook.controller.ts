import {
    Controller,
    Post,
    Body,
    Headers,
    HttpCode,
    HttpStatus,
    Logger,
    BadRequestException,
    Req,
} from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import * as crypto from 'crypto';
import { Public } from '@/modules/auth/decorators/public-route.decorator';
import type { Request } from 'express';
import { PaymentService } from '@/modules/payment/payment.service';
import { ConfigService } from '@nestjs/config';
import { EnvironmentVariables } from '@/validators/env.validation';
import { PaystackWebhookRequest } from '@/modules/payment/types/payment';

interface PaystackWebhookPayload {
    event: string;
    data: {
        reference: string;
        status: string;
        amount: number;
        customer: {
            email: string;
        };
    };
}

@Controller('payment')
@Public()
@ApiExcludeController()
export class PaymentWebhookController {
    private readonly logger = new Logger(PaymentWebhookController.name);
    private readonly secretKey: string = '';

    constructor(
        private readonly configService: ConfigService<EnvironmentVariables>,
        private readonly paymentService: PaymentService,
    ) {
        this.secretKey =
            this.configService.get<string>('PAYSTACK_SECRET_KEY') || '';
    }

    @Post('paystack')
    @HttpCode(HttpStatus.OK)
    handlePaystackWebhook(
        @Headers('x-paystack-signature') signature: string,
        @Req() req: Request<any, any, PaystackWebhookRequest>,
        @Body() payload: PaystackWebhookPayload,
    ): { message: string } {
        this.logger.log(
            `Received Paystack webhook: ${payload.event} for reference ${payload.data?.reference}`,
        );

        try {
            const body = JSON.stringify(req.body);

            if (!body) {
                throw new BadRequestException('No body found');
            }

            // Verify paystack ip
            const paystackIps = [
                '52.31.139.75',
                '52.49.173.169',
                '52.214.14.220',
            ];
            if (!paystackIps.includes(req.ip || '')) {
                throw new BadRequestException('Invalid IP');
            }

            // Verify Paystack signature
            const hash = crypto
                .createHmac('sha512', this.secretKey)
                .update(body)
                .digest('hex');

            if (hash !== signature) {
                throw new BadRequestException('Invalid signature');
            }

            if (
                req.body.event === 'charge.success' ||
                req.body.event === 'transfer.success'
            ) {
                // Process event asynchronously
                void this.paymentService.handleTransactionProcessed(
                    req.body.data.reference,
                    'SUCCESS',
                    'INSTANT_TRANSFER',
                    {
                        gateway: 'paystack',
                        gatewayFee: req.body.data.amount / 100,
                        paymentAttemptId:
                            (
                                req.body.data.metadata as {
                                    paymentAttemptId: string;
                                }
                            ).paymentAttemptId || '',
                    },
                );
            }

            return { message: 'OK' };
        } catch (error) {
            this.logger.error('Failed to process Paystack webhook', error);
            throw error;
        }
    }
}
