import { QueryTransactionsDto } from '@/modules/payment/dto/transaction';
import { PickType } from '@nestjs/swagger';

export class UserQueryTransactionsDto extends PickType(QueryTransactionsDto, [
    'limit',
    'page',
]) {}
