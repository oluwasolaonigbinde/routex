import { ApiResponse } from '@/types';
import { ExposeAll } from '@/util/decorator';
import { ApiProperty, PickType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsString, IsUUID } from 'class-validator';

export class Card {
    @ApiProperty({ type: String })
    @IsUUID()
    id: string;

    @ApiProperty({ type: String })
    @IsUUID()
    userId: string;

    @ApiProperty({ type: String })
    @IsString()
    authorizationCode: string;

    @ApiProperty({ type: String })
    @IsString()
    cardType: string;

    @ApiProperty({ type: String })
    @IsString()
    last4: string;

    @ApiProperty({ type: String })
    @IsString()
    expMonth: string;

    @ApiProperty({ type: String })
    @IsString()
    expYear: string;

    @ApiProperty({ type: String })
    @IsString()
    bin: string;

    @ApiProperty({ type: String })
    @IsString()
    bank: string;

    @ApiProperty({ type: String })
    @IsString()
    channel: string;

    @ApiProperty({ type: String })
    @IsString()
    signature: string;

    @ApiProperty({ type: String, nullable: true })
    @IsString()
    countryCode: string | null;

    @ApiProperty({ type: String, nullable: true })
    @IsString()
    accountName: string | null;

    @ApiProperty({ type: Boolean })
    @IsBoolean()
    reusable: boolean;

    @ApiProperty({ type: String })
    @IsString()
    email: string;

    @ApiProperty({ type: Boolean })
    @IsBoolean()
    isDefault: boolean;

    @ApiProperty({ type: Date })
    createdAt: Date;

    @ApiProperty({ type: Date })
    updatedAt: Date;
}

@ExposeAll()
export class CardEntity extends PickType(Card, [
    'id',
    'userId',
    'cardType',
    'last4',
    'expMonth',
    'expYear',
    'bin',
    'bank',
    'channel',
    'countryCode',
    'isDefault',
    'createdAt',
] as const) {}

// ========== ApiResponse Wrappers ==========

@ExposeAll()
export class CardApiResponse implements ApiResponse<CardEntity> {
    @ApiProperty({
        type: String,
        enum: ['pending', 'success', 'failed', 'processing'],
    })
    status: 'pending' | 'success' | 'failed' | 'processing';

    @ApiProperty({ type: String })
    message: string;

    @ApiProperty({ type: CardEntity })
    @Type(() => CardEntity)
    data: CardEntity;
}

@ExposeAll()
class CardListResult {
    @ApiProperty({ type: Number })
    totalCount: number;

    @ApiProperty({ type: Number })
    page: number;

    @ApiProperty({ type: Number })
    limit: number;

    @ApiProperty({ type: Number })
    perPage: number;

    @ApiProperty({ type: [CardEntity] })
    @Type(() => CardEntity)
    results: CardEntity[];
}

@ExposeAll()
export class CardListApiResponse implements ApiResponse<CardListResult> {
    @ApiProperty({
        type: String,
        enum: ['pending', 'success', 'failed', 'processing'],
    })
    status: 'pending' | 'success' | 'failed' | 'processing';

    @ApiProperty({ type: String })
    message: string;

    @ApiProperty({ type: CardListResult })
    @Type(() => CardListResult)
    data: CardListResult;
}
