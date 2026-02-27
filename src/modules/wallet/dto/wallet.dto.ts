import { IsInt, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class FundWalletDto {
    @ApiProperty({
        example: 1500,
    })
    @IsInt({ message: 'amount must be an integer' })
    @Min(1000, { message: 'Minimum funding amount is ₦1000' })
    amount: number;
}
