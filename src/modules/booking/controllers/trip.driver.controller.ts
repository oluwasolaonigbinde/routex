import {
    Controller,
    Post,
    Get,
    Patch,
    Body,
    Param,
    Query,
    HttpCode,
    HttpStatus,
    UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { BoardingService } from '@/modules/booking/services/boarding.service';
import { TripExecutionService } from '@/modules/booking/services/trip-execution.service';
import { DatabaseService } from '@/modules/database/database.service';
import {
    BoardPassengerDto,
    UpdateTripStatusDto,
    UpdateStopStatusDto,
} from '@/modules/booking/dto/trip.dto';
import { Tenant } from '@/modules/auth/decorators/tenant.decorator';
import type { AccessTokenDTO } from '@/types/auth';
import { DriverAssignmentGuard } from '@/modules/booking/guards/driver-assignment.guard';
import { TripStatus } from '@prisma/client';
import { UserToken } from '@/decorators/user';
import { SerializeOptions } from '@/util/decorator';
import {
    TripEntityApiResponse,
    TripListApiResponse,
    TripStopStatusApiResponse,
} from '@/modules/booking/entities/trip.entity';
import { PassengerTripApiResponse } from '@/modules/booking/entities/passenger.entity';
import { BoardingStatusApiResponse } from '@/modules/booking/entities/booking.entity';

@Controller('driver')
@ApiTags('Driver Trips Management')
@Tenant('DRIVER')
export class DriverTripsController {
    constructor(
        private readonly boardingService: BoardingService,
        private readonly tripExecutionService: TripExecutionService,
        private readonly db: DatabaseService,
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
        @UserToken() user: AccessTokenDTO,
        @Body() dto: BoardPassengerDto,
    ): Promise<PassengerTripApiResponse> {
        const result = await this.boardingService.boardPassenger(
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

    @Get('trips')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Get assigned trips for driver' })
    @ApiResponse({
        status: 200,
        description: 'Trips retrieved successfully',
        type: TripListApiResponse,
    })
    @SerializeOptions({ type: TripListApiResponse, strategy: 'excludeAll' })
    async getAssignedTrips(
        @UserToken() user: AccessTokenDTO,
        @Query('date') date?: string,
    ) {
        const searchDate = date ? new Date(date) : new Date();
        searchDate.setUTCHours(0, 0, 0, 0);

        const endOfDay = new Date(searchDate);
        endOfDay.setUTCHours(23, 59, 59, 999);

        const trips = await this.db.trip.findMany({
            where: {
                driverId: user.sub,
                departureTime: {
                    gte: searchDate,
                    lte: endOfDay,
                },
                status: {
                    in: [
                        TripStatus.SCHEDULED,
                        TripStatus.BOARDING,
                        TripStatus.IN_PROGRESS,
                    ],
                },
            },
            include: {
                route: {
                    include: {
                        startLocation: true,
                        endLocation: true,
                    },
                },
                vehicle: true,
            },
            orderBy: {
                departureTime: 'asc',
            },
        });

        return {
            status: 'success',
            message: 'Trips retrieved successfully',
            data: trips,
        };
    }

    @Get('trips/:tripId/boarding-status')
    @UseGuards(DriverAssignmentGuard)
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Get boarding status for a trip' })
    @ApiResponse({
        status: 200,
        description: 'Boarding status retrieved successfully',
        type: BoardingStatusApiResponse,
    })
    @SerializeOptions({
        type: BoardingStatusApiResponse,
        strategy: 'excludeAll',
    })
    async getBoardingStatus(
        @Param('tripId') tripId: string,
    ): Promise<BoardingStatusApiResponse> {
        const status = await this.boardingService.getBoardingStatus(tripId);

        return {
            status: 'success',
            message: 'Boarding status retrieved successfully',
            data: status,
        };
    }

    @Patch('trips/:tripId/status')
    @UseGuards(DriverAssignmentGuard)
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Update trip status' })
    @ApiResponse({
        status: 200,
        description: 'Trip status updated successfully',
        type: TripEntityApiResponse,
    })
    @SerializeOptions({ type: TripEntityApiResponse, strategy: 'excludeAll' })
    async updateTripStatus(
        @UserToken() user: AccessTokenDTO,
        @Param('tripId') tripId: string,
        @Body() dto: UpdateTripStatusDto,
    ): Promise<TripEntityApiResponse> {
        const trip = await this.tripExecutionService.updateTripStatus(
            tripId,
            dto.status,
            user.sub,
        );

        return {
            status: 'success',
            message: 'Trip status updated successfully',
            data: trip,
        };
    }

    @Post('trips/:tripId/stops/:stopId/status')
    @UseGuards(DriverAssignmentGuard)
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

    @Get('trips/:tripId')
    @UseGuards(DriverAssignmentGuard)
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Get trip execution details' })
    @ApiResponse({
        status: 200,
        description: 'Trip details retrieved successfully',
        type: TripEntityApiResponse,
    })
    @SerializeOptions({ type: TripEntityApiResponse, strategy: 'excludeAll' })
    async getTripDetails(
        @Param('tripId') tripId: string,
    ): Promise<TripEntityApiResponse> {
        const trip =
            await this.tripExecutionService.getTripExecutionDetails(tripId);

        return {
            status: 'success',
            message: 'Trip details retrieved successfully',
            data: trip,
        };
    }
}
