import {
    Controller,
    Get,
    Query,
    Param,
    HttpCode,
    HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { DatabaseService } from '@/modules/database/database.service';
import { SerializeOptions } from '@/util/decorator';
import {
    TripEntityApiResponse,
    TripListApiResponse,
} from '@/modules/booking/entities/trip.entity';
import { Tenant } from '@/modules/auth/decorators/tenant.decorator';
import { TripUserService } from '@/modules/booking/services/trip.user.service';
import { UserSearchTripsDto } from '@/modules/booking/dto/trip.user.dto';

@Controller('trips')
@ApiTags('Trips')
@Tenant('USER')
export class TripController {
    constructor(
        private readonly db: DatabaseService,
        private readonly tripService: TripUserService,
    ) {}

    @Get('search')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Search for available trips' })
    @ApiResponse({
        status: 200,
        description: 'Trips found successfully',
        type: TripListApiResponse,
    })
    @SerializeOptions({ type: TripListApiResponse, strategy: 'excludeAll' })
    async searchTrips(@Query() query: UserSearchTripsDto) {
        const trips = await this.tripService.searchTrips(query);

        return {
            status: 'success',
            message: `Found ${trips.results.length} available trips`,
            data: trips,
        };
    }

    @Get(':id')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Get trip' })
    @ApiResponse({
        status: 200,
        description: 'Trip retrieved successfully',
        type: TripEntityApiResponse,
    })
    @SerializeOptions({ type: TripEntityApiResponse, strategy: 'excludeAll' })
    async getTripById(@Param('id') id: string): Promise<TripEntityApiResponse> {
        const trip = await this.tripService.getTripById(id);

        return {
            status: 'success',
            message: 'Trip retrieved successfully',
            data: trip,
        };
    }
}
