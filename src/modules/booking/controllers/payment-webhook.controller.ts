import {
    Controller,
    Post,
    Body,
    Headers,
    HttpCode,
    HttpStatus,
    Logger,
    RawBodyRequest,
    Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiExcludeEndpoint } from '@nestjs/swagger';
import { BookingService } from '../services/booking.service';
import { PaymentService } from '../services/payment.service';
import { Public } from '@/modules/auth/decorators/public-route.decorator';
import type { Request } from 'express';

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
@ApiTags('Webhooks')
@Public()
export class PaymentWebhookController {
    private readonly logger = new Logger(PaymentWebhookController.name);

    constructor(
        private readonly bookingService: BookingService,
        private readonly paymentService: PaymentService,
    ) {}

    @Post('paystack')
    @HttpCode(HttpStatus.OK)
    @ApiExcludeEndpoint() // Exclude from Swagger docs
    async handlePaystackWebhook(
        @Headers('x-paystack-signature') signature: string,
        @Req() request: Request,
        @Body() payload: PaystackWebhookPayload,
    ): Promise<{ message: string }> {
        this.logger.log(
            `Received Paystack webhook: ${payload.event} for reference ${payload.data?.reference}`,
        );

        // Verify webhook signature
        const rawBody = JSON.stringify(payload);
        const isValid = this.paymentService.validateWebhookSignature(
            signature,
            rawBody,
        );

        if (!isValid) {
            this.logger.error('Invalid Paystack webhook signature');
            return { message: 'Invalid signature' };
        }

        // Handle the event
        try {
            switch (payload.event) {
                case 'charge.success':
                    await this.bookingService.confirmBooking(
                        payload.data.reference,
                    );
                    this.logger.log(
                        `Payment confirmed for reference: ${payload.data.reference}`,
                    );
                    break;

                case 'charge.failed':
                    this.logger.warn(
                        `Payment failed for reference: ${payload.data.reference}`,
                    );
                    // Optionally handle failed payments
                    break;

                default:
                    this.logger.log(`Unhandled event type: ${payload.event}`);
            }

            return { message: 'Webhook processed successfully' };
        } catch (error) {
            this.logger.error(
                `Error processing webhook: ${error.message}`,
                error.stack,
            );
            // Still return 200 to prevent Paystack from retrying
            return { message: 'Webhook received' };
        }
    }
}
