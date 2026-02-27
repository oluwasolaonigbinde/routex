import { Module } from '@nestjs/common';
import { PaymentModule } from '@/modules/payment/payment.module';
import { WalletService } from '@/modules/wallet/services/wallet.service';
import { WalletController } from '@/modules/wallet/wallet.controller';

@Module({
    imports: [PaymentModule],
    controllers: [WalletController],
    providers: [WalletService],
})
export class WalletModule {}
