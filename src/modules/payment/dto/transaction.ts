import { Transaction } from '@/modules/payment/entities/transaction';
import { PaginatedQuery } from '@/util/dto';
import { IntersectionType, PartialType, PickType } from '@nestjs/swagger';
import { Prisma } from '@prisma/client';

export class CreateTransactionDto
    extends PickType(Transaction, [
        'amount',
        'description',
        'type',
        'intent',
        'bookingId',
    ] as const)
    implements
        Pick<
            Prisma.TransactionUncheckedCreateInput,
            'amount' | 'description' | 'type' | 'intent' | 'bookingId'
        > {}

export class QueryTransactionsDto extends IntersectionType(
    PaginatedQuery,
    PartialType(
        PickType(Transaction, [
            'status',
            'type',
            'intent',
            'userId',
            'walletId',
        ] as const),
    ),
) {}
