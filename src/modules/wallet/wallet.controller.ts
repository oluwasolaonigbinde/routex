import {
    Body,
    Controller,
    Get,
    HttpCode,
    HttpStatus,
    Post,
    Query,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Tenant } from '@/modules/auth/decorators/tenant.decorator';
import type { AccessTokenDTO } from '@/types/auth';
import { UserToken } from '@/decorators/user';
import { SerializeOptions } from '@/util/decorator';
import { WalletService } from '@/modules/wallet/services/wallet.service';
import { FundWalletDto } from '@/modules/wallet/dto/wallet.dto';
import {
    FundWalletApiResponse,
    WalletApiResponse,
} from '@/modules/wallet/entities/wallet.entity';
import { UserQueryTransactionsDto } from '@/modules/payment/dto/transaction.user';
import { PaymentService } from '@/modules/payment/payment.service';
import { UserTransactionListApiResponse } from '@/modules/payment/entities/transaction.user';

@Controller('wallet')
@ApiTags('Wallet')
@Tenant('USER')
export class WalletController {
    constructor(
        private readonly walletService: WalletService,
        private readonly paymentService: PaymentService,
    ) {}

    @Get()
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Get wallet information' })
    @ApiResponse({
        status: 200,
        description: 'Wallet retrieved successfully',
        type: WalletApiResponse,
    })
    @SerializeOptions({ type: WalletApiResponse, strategy: 'excludeAll' })
    async getWallet(
        @UserToken() user: AccessTokenDTO,
    ): Promise<WalletApiResponse> {
        const wallet = await this.walletService.getWallet(user.sub);

        return {
            status: 'success',
            message: 'Wallet retrieved successfully',
            data: wallet,
        };
    }

    @Post('fund')
    @HttpCode(HttpStatus.CREATED)
    @ApiOperation({ summary: 'Fund wallet via Paystack' })
    @ApiResponse({
        status: 201,
        description: 'Wallet funding initiated. Redirect user to paymentUrl.',
        type: FundWalletApiResponse,
    })
    @SerializeOptions({ type: FundWalletApiResponse, strategy: 'excludeAll' })
    async fundWallet(
        @UserToken() user: AccessTokenDTO,
        @Body() fundWalletDto: FundWalletDto,
    ): Promise<FundWalletApiResponse> {
        const payment = await this.walletService.initiateWalletTopUp(
            user.sub,
            fundWalletDto,
        );

        console.log("payment", payment)

        return {
            status: 'success',
            message:
                'Wallet funding initiated. Complete payment to credit your wallet.',
            data: payment,
        };
    }

    @Get('transactions')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Get wallet transaction history' })
    @ApiResponse({
        status: 200,
        description: 'Wallet transactions retrieved successfully',
        type: UserTransactionListApiResponse,
    })
    @SerializeOptions({
        type: UserTransactionListApiResponse,
        strategy: 'excludeAll',
    })
    async getTransactions(
        @UserToken() user: AccessTokenDTO,
        @Query() query: UserQueryTransactionsDto,
    ): Promise<UserTransactionListApiResponse> {
        const data = await this.paymentService.getTransactions({
            ...query,
            userId: user.sub,
            status: 'SUCCESS',
        });

        return {
            status: 'success',
            message: 'Wallet transactions retrieved successfully',
            data,
        };
    }
}
