import { TransactionEntity } from '@/modules/payment/entities/transaction';
import { PaginatedResponse } from '@/types';
import { ExposeAll } from '@/util/decorator';
import { ApiProperty, PickType } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class UserTransactionEntity extends PickType(TransactionEntity, [
    'id',
    'amount',
    'description',
    'balance',
    'metadata',
    'type',
    'intent',
    'status',
    'createdAt',
    'succeededAt',
    'failedAt',
    'gateway',
    'gatewayFee',
    'gross',
    'source',
    'userId',
] as const) {}

// ========== ApiResponse Wrappers ==========

@ExposeAll()
class UserTransactionListResult {
    @ApiProperty({ type: Number })
    totalCount: number;

    @ApiProperty({ type: Number })
    page: number;

    @ApiProperty({ type: Number })
    limit: number;

    @ApiProperty({ type: Number })
    perPage: number;

    @ApiProperty({ type: [UserTransactionEntity] })
    @Type(() => UserTransactionEntity)
    results: UserTransactionEntity[];
}

@ExposeAll()
export class UserTransactionListApiResponse implements PaginatedResponse<UserTransactionEntity> {
    @ApiProperty({
        type: String,
        enum: ['pending', 'success', 'failed', 'processing'],
    })
    status: 'pending' | 'success' | 'failed' | 'processing';

    @ApiProperty({ type: String })
    message: string;

    @ApiProperty({ type: UserTransactionListResult })
    @Type(() => UserTransactionListResult)
    data: UserTransactionListResult;
}
