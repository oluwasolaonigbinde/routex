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

    @ApiProperty({ type: String })
    @IsString()
    checkoutUrl: string;

    @ApiProperty({ type: String })
    @IsString()
    reference: string;

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
    expiresIn: string;
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
