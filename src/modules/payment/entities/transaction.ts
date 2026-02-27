import { PaginatedResponse } from '@/types';
import { ExposeAll } from '@/util/decorator';
import { ApiProperty, PickType } from '@nestjs/swagger';
import { $Enums, Transaction as PrismaTransaction } from '@prisma/client';
import type { JsonValue } from '@prisma/client/runtime/client';
import { Type } from 'class-transformer';
import { IsEnum, IsNumber, IsString, IsUUID } from 'class-validator';

export class Transaction implements PrismaTransaction {
    @ApiProperty({ type: String })
    @IsUUID()
    id: string;

    @ApiProperty({ type: Number })
    @IsNumber()
    amount: number;

    @IsString()
    @ApiProperty({ type: String, nullable: true })
    approvedById: string | null;

    @ApiProperty({ type: String, nullable: true })
    @IsString()
    balance: number | null;

    @ApiProperty({ type: Date, nullable: true })
    createdAt: Date;

    @ApiProperty({ type: String, nullable: true })
    @IsString()
    description: string;

    @ApiProperty({ type: String, nullable: true })
    @IsString()
    bookingId: string | null;

    @ApiProperty({ type: Date, nullable: true })
    failedAt: Date | null;

    @ApiProperty({ type: String, nullable: true })
    @IsString()
    gateway: string | null;

    @ApiProperty({ type: Number, nullable: true })
    @IsNumber()
    gatewayFee: number | null;

    @ApiProperty({ type: Number, nullable: true })
    @IsNumber()
    gross: number | null;

    @ApiProperty({ enum: $Enums.TransactionIntent })
    @IsEnum($Enums.TransactionIntent)
    intent: $Enums.TransactionIntent;

    @ApiProperty({ type: Object })
    metadata: JsonValue;

    @ApiProperty({ type: String })
    @IsString()
    reference: string;

    @ApiProperty({ enum: $Enums.TransactionStatus })
    @IsEnum($Enums.TransactionStatus)
    status: $Enums.TransactionStatus;

    @ApiProperty({ type: Date, nullable: true })
    succeededAt: Date | null;

    @ApiProperty({ enum: $Enums.TransactionSource, nullable: true })
    @IsEnum($Enums.TransactionSource)
    source: $Enums.TransactionSource | null;

    @ApiProperty({ enum: $Enums.TransactionType })
    @IsEnum($Enums.TransactionType)
    type: $Enums.TransactionType;

    @ApiProperty({ type: String, nullable: true })
    @IsUUID()
    walletId: string | null;

    @ApiProperty({ type: String })
    @IsUUID()
    userId: string;
}

@ExposeAll()
export class TransactionEntity extends PickType(Transaction, [
    'id',
    'amount',
    'approvedById',
    'balance',
    'createdAt',
    'description',
    'failedAt',
    'gateway',
    'gatewayFee',
    'gross',
    'intent',
    'metadata',
    'reference',
    'status',
    'succeededAt',
    'source',
    'type',
    'walletId',
    'userId',
] as const) {}

// ========== ApiResponse Wrappers ==========

@ExposeAll()
class TransactionListResult {
    @ApiProperty({ type: Number })
    totalCount: number;

    @ApiProperty({ type: Number })
    page: number;

    @ApiProperty({ type: Number })
    limit: number;

    @ApiProperty({ type: Number })
    perPage: number;

    @ApiProperty({ type: [TransactionEntity] })
    @Type(() => TransactionEntity)
    results: TransactionEntity[];
}

@ExposeAll()
export class TransactionListApiResponse implements PaginatedResponse<TransactionEntity> {
    @ApiProperty({
        type: String,
        enum: ['pending', 'success', 'failed', 'processing'],
    })
    status: 'pending' | 'success' | 'failed' | 'processing';

    @ApiProperty({ type: String })
    message: string;

    @ApiProperty({ type: TransactionListResult })
    @Type(() => TransactionListResult)
    data: TransactionListResult;
}
