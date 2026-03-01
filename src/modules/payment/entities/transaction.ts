import { PaginatedResponse } from '@/types';
import { ExposeAll } from '@/util/decorator';
import { ApiProperty, PickType } from '@nestjs/swagger';
import {
    $Enums,
    Transaction as PrismaTransaction,
    BankAccount as PrismaBankAccount,
} from '@prisma/client';
import type { JsonValue } from '@prisma/client/runtime/client';
import { Type } from 'class-transformer';
import { IsEnum, IsNumber, IsString, IsUUID, Length } from 'class-validator';

export class BankAccount implements PrismaBankAccount {
    @ApiProperty({ type: String })
    @IsUUID()
    id: string;

    @ApiProperty({ type: Date })
    createdAt: Date;

    @ApiProperty({ type: Date })
    updatedAt: Date;

    @ApiProperty({ type: String })
    @IsString()
    bankCode: string;

    @ApiProperty({ type: String })
    @IsString()
    @Length(11, 11)
    accountNumber: string;

    @ApiProperty({ type: String })
    @IsString()
    accountName: string;

    @ApiProperty({ type: String })
    @IsString()
    bankName: string;
}

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

    @ApiProperty({ enum: $Enums.TransactionDestination })
    @IsEnum($Enums.TransactionDestination)
    destination: $Enums.TransactionDestination;

    @ApiProperty({ type: Date, nullable: true })
    createdAt: Date;

    @ApiProperty({ type: String, nullable: true })
    @IsString()
    description: string;

    @ApiProperty({ type: String, nullable: true })
    @IsString()
    bookingId: string | null;

    @ApiProperty({ type: String, nullable: true })
    @IsString()
    reason: string | null;

    @ApiProperty({ type: Date, nullable: true })
    failedAt: Date | null;

    @ApiProperty({ type: String, nullable: true })
    @IsString()
    gateway: string | null;

    @ApiProperty({ type: Number, nullable: true })
    @IsNumber()
    gatewayFee: number | null;

    @ApiProperty({ type: String, nullable: true })
    @IsUUID()
    bankId: string | null;

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

    @ApiProperty({ enum: $Enums.TransactionSource })
    @IsEnum($Enums.TransactionSource)
    source: $Enums.TransactionSource;

    @ApiProperty({ enum: $Enums.TransactionType })
    @IsEnum($Enums.TransactionType)
    type: $Enums.TransactionType;

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
    'destination',
    'source',
    'gatewayFee',
    'gross',
    'intent',
    'metadata',
    'reference',
    'status',
    'succeededAt',
    'source',
    'type',
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
