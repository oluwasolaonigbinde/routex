import { UserToken } from '@/decorators/user';
import { Tenant } from '@/modules/auth/decorators/tenant.decorator';
import { GetLocationsDto, GetRoutesDto } from '@/modules/booking/dto/route.dto';
import {
    LocationListApiResponse,
    RouteEntityApiResponse,
    RouteListApiResponse,
} from '@/modules/booking/entities/route.entity';
import { RouteUserService } from '@/modules/booking/services/route.user.service';
import {
    FavoriteRouteApiResponse,
    FavoriteRouteListApiResponse,
} from '@/modules/user/entities/user.entity';
import { ApiResponse as ApiResponseType } from '@/types';
import type { AccessTokenDTO } from '@/types/auth';
import { SerializeOptions } from '@/util/decorator';
import { PaginatedQuery } from '@/util/dto';
import {
    Controller,
    Delete,
    Get,
    HttpCode,
    HttpStatus,
    Param,
    Post,
    Query,
} from '@nestjs/common';
import {
    ApiBearerAuth,
    ApiOperation,
    ApiResponse,
    ApiTags,
} from '@nestjs/swagger';

@Tenant('USER')
@ApiTags('Routes')
@Controller('routes')
export class RouteUserController {
    constructor(private readonly routeService: RouteUserService) {}

    @Get('locations')
    @ApiOperation({ summary: 'List all locations' })
    @ApiResponse({
        status: 200,
        description: 'List of locations',
        type: LocationListApiResponse,
    })
    @SerializeOptions({ type: LocationListApiResponse, strategy: 'excludeAll' })
    async listLocations(
        @Query() query: GetLocationsDto,
    ): Promise<LocationListApiResponse> {
        const data = await this.routeService.listLocations(query);

        return {
            status: 'success',
            message: 'Locations retrieved successfully',
            data,
        };
    }

    @Get('')
    @ApiOperation({ summary: 'List all routes' })
    @ApiResponse({
        status: 200,
        description: 'List of routes',
        type: RouteListApiResponse,
    })
    @SerializeOptions({ type: RouteListApiResponse, strategy: 'excludeAll' })
    async listRoutes(
        @Query() query: GetRoutesDto,
    ): Promise<RouteListApiResponse> {
        const data = await this.routeService.listRoutes(query);

        return {
            status: 'success',
            message: 'Routes retrieved successfully',
            data,
        };
    }

    @Get('/:id')
    @ApiOperation({ summary: 'Get route by ID' })
    @ApiResponse({
        status: 200,
        description: 'Route details',
        type: RouteEntityApiResponse,
    })
    @SerializeOptions({ type: RouteEntityApiResponse, strategy: 'excludeAll' })
    async getRoute(@Param('id') id: string): Promise<RouteEntityApiResponse> {
        const data = await this.routeService.getRoute(id);

        return {
            status: 'success',
            message: 'Route retrieved successfully',
            data,
        };
    }

    // ========== Favorite Routes ==========

    @Post('/favorites/:routeId')
    @HttpCode(HttpStatus.CREATED)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Favorite a route' })
    @ApiResponse({
        status: 201,
        description: 'Route added to favorites',
        type: FavoriteRouteApiResponse,
    })
    @SerializeOptions({
        type: FavoriteRouteApiResponse,
        strategy: 'excludeAll',
    })
    async favoriteRoute(
        @UserToken() user: AccessTokenDTO,
        @Param('routeId') routeId: string,
    ): Promise<FavoriteRouteApiResponse> {
        const data = await this.routeService.favoriteRoute(user.sub, routeId);
        return {
            status: 'success',
            message: 'Route added to favorites',
            data,
        };
    }

    @Delete('/favorites/:routeId')
    @HttpCode(HttpStatus.OK)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Unfavorite a route' })
    @ApiResponse({ status: 200, description: 'Route removed from favorites' })
    async unfavoriteRoute(
        @UserToken() user: AccessTokenDTO,
        @Param('routeId') routeId: string,
    ): Promise<ApiResponseType> {
        await this.routeService.unfavoriteRoute(user.sub, routeId);
        return {
            status: 'success',
            message: 'Route removed from favorites',
        };
    }

    @Get('/favorites')
    @HttpCode(HttpStatus.OK)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'List favorite routes' })
    @ApiResponse({
        status: 200,
        description: 'Favorite routes retrieved successfully',
        type: FavoriteRouteListApiResponse,
    })
    @SerializeOptions({
        type: FavoriteRouteListApiResponse,
        strategy: 'excludeAll',
    })
    async getFavoriteRoutes(
        @UserToken() user: AccessTokenDTO,
        @Query() query: PaginatedQuery,
    ): Promise<FavoriteRouteListApiResponse> {
        const data = await this.routeService.getFavoriteRoutes(user.sub, query);
        return {
            status: 'success',
            message: 'Favorite routes retrieved successfully',
            data,
        };
    }
}
