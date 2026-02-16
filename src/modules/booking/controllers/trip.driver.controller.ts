import {
    Controller,
    Post,
    Get,
    Body,
    Param,
    Query,
    HttpCode,
    HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { TripExecutionService } from '@/modules/booking/services/trip-execution.service';
import { DatabaseService } from '@/modules/database/database.service';
import {
    BoardPassengerDto,
    UpdateStopStatusDto,
} from '@/modules/booking/dto/trip.dto';
import { Tenant } from '@/modules/auth/decorators/tenant.decorator';
import type { AccessTokenDTO } from '@/types/auth';
import { PassengerTrip, TripStatus } from '@prisma/client';
import { UserToken } from '@/decorators/user';
import { SerializeOptions } from '@/util/decorator';
import {
    TripEntityApiResponse,
    TripListApiResponse,
    TripStopStatusApiResponse,
} from '@/modules/booking/entities/trip.entity';
import { PassengerTripApiResponse } from '@/modules/booking/entities/passenger.entity';
import { PassengersListApiResponse } from '@/modules/booking/entities/booking.entity';
import { PaginatedResponse } from '@/util/dto';
import { TripService } from '@/modules/booking/services/trip.service';
import { DriverSearchPassengerTripsDto } from '@/modules/booking/dto/trip.driver.dto';
import type { DriverAccessTokenDTO } from '@/modules/driver/entities/driver.entity';

@Controller('driver/trips')
@ApiTags('Driver Trips Management')
@Tenant('DRIVER')
export class DriverTripsController {
    constructor(
        private readonly tripExecutionService: TripExecutionService,
        private readonly db: DatabaseService,
        private readonly tripService: TripService,
    ) {}

    @Post('board-passenger')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Board a passenger by scanning QR code' })
    @ApiResponse({
        status: 200,
        description: 'Passenger boarded successfully',
        type: PassengerTripApiResponse,
    })
    @SerializeOptions({
        type: PassengerTripApiResponse,
        strategy: 'excludeAll',
    })
    async boardPassenger(
        @UserToken() user: DriverAccessTokenDTO,
        @Body() dto: BoardPassengerDto,
    ): Promise<PassengerTripApiResponse> {
        const result = await this.tripExecutionService.boardPassenger(
            user.sub,
            dto.boardingToken,
        );

        return {
            status: 'success',
            message: result.alreadyBoarded
                ? 'Passenger already boarded'
                : 'Passenger boarded successfully',
            data: result.passengerTrip,
        };
    }

    @Post('alight-passenger')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Alight a passenger by scanning QR code' })
    @ApiResponse({
        status: 200,
        description: 'Passenger alighted successfully',
        type: PassengerTripApiResponse,
    })
    @SerializeOptions({
        type: PassengerTripApiResponse,
        strategy: 'excludeAll',
    })
    async alightPassenger(
        @UserToken() user: DriverAccessTokenDTO,
        @Body() dto: BoardPassengerDto,
    ): Promise<PassengerTripApiResponse> {
        const result = await this.tripExecutionService.alightPassenger(
            user.sub,
            dto.boardingToken,
        );

        return {
            status: 'success',
            message: result.alreadyAlighted
                ? 'Passenger already alighted'
                : 'Passenger alighted successfully',
            data: result.passengerTrip,
        };
    }

    @Get('assigned')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Get assigned trips for driver' })
    @ApiResponse({
        status: 200,
        description: 'Trips found successfully',
        type: TripListApiResponse,
    })
    @SerializeOptions({ type: TripListApiResponse, strategy: 'excludeAll' })
    async getAssignedTrips(
        @UserToken() user: DriverAccessTokenDTO,
        @Query() query: DriverSearchPassengerTripsDto,
    ) {
        const trips = await this.tripService.searchTrips({
            ...query,
            driverId: user.sub,
        });
        return {
            status: 'success',
            message: `Found ${trips.results.length} assigned trips`,
            data: trips,
        };
    }

    @Post(':tripId/open-boarding')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({
        summary: 'Open boarding for a trip (start accepting passengers)',
    })
    @ApiResponse({
        status: 200,
        description: 'Boarding opened successfully',
        type: TripEntityApiResponse,
    })
    @SerializeOptions({ type: TripEntityApiResponse, strategy: 'excludeAll' })
    async openBoarding(
        @UserToken() user: DriverAccessTokenDTO,
        @Param('tripId') tripId: string,
    ): Promise<TripEntityApiResponse> {
        const trip = await this.tripExecutionService.openBoarding(
            tripId,
            user.sub,
        );

        return {
            status: 'success',
            message: 'Boarding opened successfully',
            data: trip,
        };
    }

    @Post(':tripId/start')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Start the trip (begin journey)' })
    @ApiResponse({
        status: 200,
        description: 'Trip started successfully',
        type: TripEntityApiResponse,
    })
    @SerializeOptions({ type: TripEntityApiResponse, strategy: 'excludeAll' })
    async startTrip(
        @UserToken() user: AccessTokenDTO,
        @Param('tripId') tripId: string,
    ): Promise<TripEntityApiResponse> {
        const trip = await this.tripExecutionService.updateTripStatus(
            tripId,
            TripStatus.IN_PROGRESS,
            user.sub,
        );

        return {
            status: 'success',
            message: 'Trip started successfully',
            data: trip,
        };
    }

    @Post(':tripId/complete')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Complete the trip (mark as finished)' })
    @ApiResponse({
        status: 200,
        description: 'Trip completed successfully',
        type: TripEntityApiResponse,
    })
    @SerializeOptions({ type: TripEntityApiResponse, strategy: 'excludeAll' })
    async completeTrip(
        @UserToken() user: AccessTokenDTO,
        @Param('tripId') tripId: string,
    ): Promise<TripEntityApiResponse> {
        const trip = await this.tripExecutionService.updateTripStatus(
            tripId,
            TripStatus.COMPLETED,
            user.sub,
        );

        return {
            status: 'success',
            message: 'Trip completed successfully',
            data: trip,
        };
    }

    @Get(':tripId/passengers')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Get passengers for a trip' })
    @ApiResponse({
        status: 200,
        description: 'Passengers retrieved successfully',
        type: PassengersListApiResponse,
    })
    @SerializeOptions({
        type: PassengersListApiResponse,
        strategy: 'excludeAll',
    })
    async getPassengers(
        @UserToken() user: DriverAccessTokenDTO,
        @Param('tripId') tripId: string,
        @Query() query: DriverSearchPassengerTripsDto,
    ): Promise<PaginatedResponse<PassengerTrip>> {
        const results = await this.tripService.getPassengerTrips(tripId, {
            ...query,
            driverId: user.sub,
        });

        return {
            status: 'success',
            message: 'Boarding status retrieved successfully',
            data: results,
        };
    }

    @Post(':tripId/stops/:stopId/status')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Update stop status' })
    @ApiResponse({
        status: 200,
        description: 'Stop status updated successfully',
        type: TripStopStatusApiResponse,
    })
    @SerializeOptions({
        type: TripStopStatusApiResponse,
        strategy: 'excludeAll',
    })
    async updateStopStatus(
        @Param('tripId') tripId: string,
        @Param('stopId') stopId: string,
        @Body() dto: UpdateStopStatusDto,
    ): Promise<TripStopStatusApiResponse> {
        const stopStatus = await this.tripExecutionService.updateStopStatus(
            tripId,
            stopId,
            dto.status,
        );

        return {
            status: 'success',
            message: 'Stop status updated successfully',
            data: stopStatus,
        };
    }

    @Get(':tripId')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Get trip details' })
    @ApiResponse({
        status: 200,
        description: 'Trip details retrieved successfully',
        type: TripEntityApiResponse,
    })
    @SerializeOptions({ type: TripEntityApiResponse, strategy: 'excludeAll' })
    async getTripDetails(
        @Param('tripId') tripId: string,
    ): Promise<TripEntityApiResponse> {
        const trip = await this.tripService.getTripById(tripId);

        return {
            status: 'success',
            message: 'Trip details retrieved successfully',
            data: trip,
        };
    }
}
