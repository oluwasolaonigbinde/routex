import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsString } from 'class-validator';

export class CardChannel {
    @ApiProperty({
        type: String,
        enum: ['processing', 'pending', 'success', 'failed'],
    })
    status: 'processing' | 'pending' | 'success' | 'failed';

    @ApiProperty({ type: String, enum: ['card'] })
    channel: 'card';
}

export class WalletChannel {
    @ApiProperty({
        type: String,
        enum: ['processing', 'pending', 'success', 'failed'],
    })
    status: 'processing' | 'pending' | 'success' | 'failed';

    @ApiProperty({ type: String, enum: ['wallet'] })
    channel: 'wallet';
}

export class InstantTransferChannel {
    @ApiProperty({ type: String })
    @IsString()
    checkoutUrl: string;

    @ApiProperty({ type: String })
    @IsString()
    expiresIn: string;

    @ApiProperty({ type: Number })
    @IsNumber()
    amount: number;

    @ApiProperty({ type: Number })
    @IsNumber()
    fee: number;

    @ApiProperty({ type: Number })
    @IsNumber()
    net: number;

    @ApiProperty({ type: String })
    @IsString()
    reference: string;

    @ApiProperty({ type: String, enum: ['instant_transfer'] })
    @IsString()
    channel: 'instant_transfer';

    @ApiProperty({
        type: String,
        enum: ['processing', 'pending', 'success', 'failed'],
    })
    @IsString()
    status: 'processing' | 'pending' | 'success' | 'failed';
}

export type PaymentChannel =
    | CardChannel
    | WalletChannel
    | InstantTransferChannel;

export type PaystackWebhookRequest = {
    event: 'charge.success';
    data: {
        id: number;
        domain: string;
        status: string;
        reference: string;
        amount: number;
        message: string | null;
        gateway_response: string;
        paid_at: string;
        created_at: string;
        channel: string;
        currency: string;
        ip_address: string;
        metadata: any;
        fees: number;
    };
};
