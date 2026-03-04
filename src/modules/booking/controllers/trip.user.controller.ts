import {
    Controller,
    Get,
    Query,
    Param,
    HttpCode,
    HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { SerializeOptions } from '@/util/decorator';
import { DriverEmbedEntityApiResponse } from '@/modules/driver/entities/driver.entity';
import { Tenant } from '@/modules/auth/decorators/tenant.decorator';
import { TripUserService } from '@/modules/booking/services/trip.user.service';
import { UserSearchTripsDto } from '@/modules/booking/dto/trip.user.dto';
import {
    UserTripEntityApiResponse,
    UserTripListApiResponse,
} from '@/modules/booking/entities/trip.user.entity';

@Controller('trips')
@ApiTags('Trips')
@Tenant('USER')
export class TripController {
    constructor(private readonly tripService: TripUserService) {}

    @Get('search')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Search for available trips' })
    @ApiResponse({
        status: 200,
        description: 'Trips found successfully',
        type: UserTripListApiResponse,
    })
    @SerializeOptions({ type: UserTripListApiResponse, strategy: 'excludeAll' })
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
        type: UserTripEntityApiResponse,
    })
    @SerializeOptions({
        type: UserTripEntityApiResponse,
        strategy: 'excludeAll',
    })
    async getTripById(
        @Param('id') id: string,
    ): Promise<UserTripEntityApiResponse> {
        const trip = await this.tripService.getTripById(id);

        return {
            status: 'success',
            message: 'Trip retrieved successfully',
            data: trip,
        };
    }

    @Get(':id/driver')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Get the driver assigned to a trip' })
    @ApiResponse({
        status: 200,
        description: 'Driver retrieved successfully',
        type: DriverEmbedEntityApiResponse,
    })
    @ApiResponse({
        status: 404,
        description:
            'Driver information is only available from the boarding window onwards',
    })
    @SerializeOptions({
        type: DriverEmbedEntityApiResponse,
        strategy: 'excludeAll',
    })
    async getTripDriver(
        @Param('id') id: string,
    ): Promise<DriverEmbedEntityApiResponse> {
        const driver = await this.tripService.getTripDriver(id);

        return {
            status: 'success',
            message: 'Driver retrieved successfully',
            data: driver,
        };
    }
}
