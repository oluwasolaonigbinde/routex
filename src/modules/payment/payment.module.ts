import { Module } from '@nestjs/common';
import { PaymentService } from '@/modules/payment/payment.service';
import { PaymentWebhookController } from '@/modules/payment/payment-webhook.controller';

@Module({
    providers: [PaymentService],
    exports: [PaymentService],
    controllers: [PaymentWebhookController],
})
export class PaymentModule {}
