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
import { SearchTripsDto } from '../dto/booking.dto';
import { Public } from '@/modules/auth/decorators/public-route.decorator';
import { SerializeOptions } from '@/util/decorator';
import {
    TripEntityApiResponse,
    TripListApiResponse,
} from '../entities/trip.entity';
import { TripService } from '../services/trip.service';

@Controller('trips')
@ApiTags('Trips')
@Public()
export class TripController {
    constructor(
        private readonly db: DatabaseService,
        private readonly tripService: TripService,
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
    async searchTrips(@Query() query: SearchTripsDto) {
        const trips = await this.tripService.searchTrips(query);

        console.log('trips', trips);
        return {
            status: 'success',
            message: `Found ${trips.results.length} available trips`,
            data: trips,
        };
    }

    @Get(':id')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Get trip details' })
    @ApiResponse({
        status: 200,
        description: 'Trip retrieved successfully',
        type: TripEntityApiResponse,
    })
    @SerializeOptions({ type: TripEntityApiResponse, strategy: 'excludeAll' })
    async getTripById(@Param('id') id: string): Promise<TripEntityApiResponse> {
        const trip = await this.db.trip.findUnique({
            where: { id },
            include: {
                route: {
                    include: {
                        startLocation: true,
                        endLocation: true,
                        routeStops: {
                            include: {
                                stop: true,
                            },
                            orderBy: {
                                sequence: 'asc',
                            },
                        },
                    },
                },
                vehicle: true,
                tripStopStatuses: {
                    include: {
                        stop: true,
                    },
                    orderBy: {
                        sequence: 'asc',
                    },
                },
            },
        });

        if (!trip) {
            return {
                status: 'failed',
                message: 'Trip not found',
            };
        }

        return {
            status: 'success',
            message: 'Trip retrieved successfully',
            data: trip,
        };
    }
}
