import { ApiProperty, PickType } from '@nestjs/swagger';
import { Wallet as PrismaWallet } from '@prisma/client';
import { ExposeAll } from '@/util/decorator';
import { Expose, Type } from 'class-transformer';
import type { ApiResponse } from '@/types';
import {
    CardChannel,
    InstantTransferChannel,
    WalletChannel,
} from '@/modules/payment/types/payment';
import type { PaymentChannel } from '@/modules/payment/types/payment';

// ========== Base Entities ==========

@ExposeAll()
export class WalletEntity implements PrismaWallet {
    @ApiProperty({ type: String })
    id: string;

    @ApiProperty({ type: String })
    userId: string;

    @ApiProperty({
        type: Number,
        description: 'Balance in naira',
    })
    balance: number;

    @ApiProperty({ type: Date })
    createdAt: Date;

    @ApiProperty({ type: Date })
    updatedAt: Date;
}

// ========== ApiResponse Wrappers ==========

@ExposeAll()
export class WalletApiResponse implements ApiResponse<WalletEntity> {
    @ApiProperty({
        type: String,
        enum: ['pending', 'success', 'failed', 'processing'],
    })
    status: 'pending' | 'success' | 'failed' | 'processing';

    @ApiProperty({ type: String })
    message: string;

    @ApiProperty({ type: WalletEntity })
    @Type(() => WalletEntity)
    data?: WalletEntity;
}

@ExposeAll()
export class CardChannelEntity extends PickType(CardChannel, [
    'channel',
    'status',
] as const) {}

@ExposeAll()
export class WalletChannelEntity extends PickType(WalletChannel, [
    'channel',
    'status',
] as const) {}

@ExposeAll()
export class InstantTransferChannelEntity extends PickType(
    InstantTransferChannel,
    [
        'channel',
        'status',
        'checkoutUrl',
        'expiresIn',
        'amount',
        'fee',
        'net',
        'reference',
    ] as const,
) {}

@ExposeAll()
export class FundWalletApiResponse implements ApiResponse<InstantTransferChannelEntity> {
    @ApiProperty({
        type: String,
        enum: ['pending', 'success', 'failed', 'processing'],
    })
    status: 'pending' | 'success' | 'failed' | 'processing';

    @ApiProperty({ type: String })
    message: string;

    @ApiProperty({
        type: InstantTransferChannelEntity,
    })
    @Type(() => InstantTransferChannelEntity)
    data: InstantTransferChannelEntity;
}
