import {
    Controller,
    Get,
    Post,
    Delete,
    Patch,
    Param,
    HttpCode,
    HttpStatus,
    Query,
} from '@nestjs/common';
import {
    ApiTags,
    ApiOperation,
    ApiResponse as SwaggerResponse,
} from '@nestjs/swagger';
import { Tenant } from '@/modules/auth/decorators/tenant.decorator';
import type { AccessTokenDTO } from '@/types/auth';
import { UserToken } from '@/decorators/user';
import { SerializeOptions } from '@/util/decorator';
import {
    CardApiResponse,
    CardListApiResponse,
} from '@/modules/payment/entities/card';
import { InstantTransferChannel } from '@/modules/payment/entities/payment';
import { CardService } from '@/modules/payment/card.service';
import { PaginatedQuery } from '@/util/dto';
import type { ApiResponse } from '@/types';

@Controller('payment/cards')
@ApiTags('Cards')
@Tenant('USER')
export class CardController {
    constructor(private readonly cardService: CardService) {}

    @Post()
    @HttpCode(HttpStatus.CREATED)
    @ApiOperation({
        summary:
            'Add a card (initiates a ₦10 charge to save card authorization)',
    })
    @SwaggerResponse({
        status: 201,
        description: 'Checkout URL to complete card authorization',
        type: InstantTransferChannel,
    })
    async addCard(
        @UserToken() user: AccessTokenDTO,
    ): Promise<ApiResponse<InstantTransferChannel>> {
        const data = await this.cardService.addCard(user.sub);
        return {
            status: 'success',
            message: 'Complete the payment to save your card',
            data,
        };
    }

    @Get()
    @ApiOperation({ summary: 'List saved cards' })
    @SwaggerResponse({
        status: 200,
        description: 'List of saved cards',
        type: CardListApiResponse,
    })
    @SerializeOptions({
        type: CardListApiResponse,
        strategy: 'excludeAll',
    })
    async getCards(
        @UserToken() user: AccessTokenDTO,
        @Query() query: PaginatedQuery,
    ): Promise<CardListApiResponse> {
        const cards = await this.cardService.getUserCards(user.sub, query);
        return {
            status: 'success',
            message: 'Cards retrieved successfully',
            data: cards,
        };
    }

    @Delete(':id')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Delete a saved card' })
    @SwaggerResponse({
        status: 200,
        description: 'Card deleted successfully',
    })
    async deleteCard(
        @UserToken() user: AccessTokenDTO,
        @Param('id') cardId: string,
    ): Promise<{ status: string; message: string }> {
        await this.cardService.deleteCard(user.sub, cardId);
        return {
            status: 'success',
            message: 'Card deleted successfully',
        };
    }

    @Patch(':id/default')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Set a card as default' })
    @SwaggerResponse({
        status: 200,
        description: 'Card set as default',
        type: CardApiResponse,
    })
    @SerializeOptions({
        type: CardApiResponse,
        strategy: 'excludeAll',
    })
    async setDefaultCard(
        @UserToken() user: AccessTokenDTO,
        @Param('id') cardId: string,
    ): Promise<CardApiResponse> {
        const card = await this.cardService.setDefaultCard(user.sub, cardId);
        return {
            status: 'success',
            message: 'Card set as default',
            data: card,
        };
    }
}
