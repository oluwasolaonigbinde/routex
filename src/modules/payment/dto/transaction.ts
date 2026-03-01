import {
    BankAccount,
    Transaction,
} from '@/modules/payment/entities/transaction';
import { PaginatedQuery } from '@/util/dto';
import { IntersectionType, PartialType, PickType } from '@nestjs/swagger';
import { Prisma } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsOptional } from 'class-validator';

export class CreateBankAccountDto
    extends PickType(BankAccount, ['bankCode', 'accountNumber'] as const)
    implements
        Pick<
            Prisma.BankAccountUncheckedCreateInput,
            'bankCode' | 'accountNumber'
        > {}

export class CreateTransactionDto
    extends PickType(Transaction, [
        'amount',
        'description',
        'type',
        'intent',
        'destination',
        'source',
        'bookingId',
    ] as const)
    implements
        Pick<
            Prisma.TransactionUncheckedCreateInput,
            | 'amount'
            | 'description'
            | 'type'
            | 'intent'
            | 'bookingId'
            | 'destination'
            | 'source'
        >
{
    @IsOptional()
    @Type(() => CreateBankAccountDto)
    bank?: CreateBankAccountDto;
}

export class QueryTransactionsDto extends IntersectionType(
    PaginatedQuery,
    PartialType(
        PickType(Transaction, ['status', 'type', 'intent', 'userId'] as const),
    ),
) {}

export class BankAccountDto extends PickType(BankAccount, [
    'bankCode',
    'accountNumber',
]) {}
