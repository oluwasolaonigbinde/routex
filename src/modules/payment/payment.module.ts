import { Module } from '@nestjs/common';
import { PaymentService } from '@/modules/payment/payment.service';
import { PaymentWebhookController } from '@/modules/payment/payment-webhook.controller';
import { CardController } from '@/modules/payment/card.controller';
import { CardService } from '@/modules/payment/card.service';

@Module({
    providers: [PaymentService, CardService],
    exports: [PaymentService],
    controllers: [PaymentWebhookController, CardController],
})
export class PaymentModule {}
