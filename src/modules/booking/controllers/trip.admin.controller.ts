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
} from '@nestjs/common';
import {
    ApiTags,
    ApiOperation,
    ApiResponse as SwaggerResponse,
} from '@nestjs/swagger';
import { Tenant } from '@/modules/auth/decorators/tenant.decorator';
import { RolesRequired } from '@/modules/auth/decorators/roles.decorator';
import { Prisma, Role } from '@prisma/client';
import { SerializeOptions } from '@/util/decorator';
import { TripScheduleService } from '@/modules/booking/services/trip-schedule.service';
import { DatabaseService } from '@/modules/database/database.service';
import {
    TripEntityApiResponse,
    TripListApiResponse,
    TripScheduleEntityApiResponse,
    TripScheduleListApiResponse,
} from '@/modules/booking/entities/trip.entity';
import {
    AssignDriverDto,
    CreateAdHocTripDto,
    CreateTripScheduleDto,
    UpdateTripScheduleDto,
} from '@/modules/booking/dto/trip.dto';
import { TripCreationService } from '@/modules/booking/services/trip-creation.service';
import { TripService } from '@/modules/booking/services/trip.service';
import { TripExecutionService } from '@/modules/booking/services/trip-execution.service';

@Controller('admin/trips')
@ApiTags('Admin - Trips')
@Tenant('ADMIN')
@RolesRequired(Role.ADMIN, Role.SUPERADMIN)
export class TripAdminController {
    constructor(
        private readonly tripScheduleService: TripScheduleService,
        private readonly tripCreationService: TripCreationService,
        private readonly db: DatabaseService,
        private readonly tripExecutionService: TripExecutionService,
        private readonly tripService: TripService,
    ) {}

    @Post('schedules')
    @HttpCode(HttpStatus.CREATED)
    @ApiOperation({ summary: 'Create a trip schedule' })
    @SwaggerResponse({
        status: 201,
        description: 'Trip schedule created successfully',
        type: TripScheduleEntityApiResponse,
    })
    @SerializeOptions({
        type: TripScheduleEntityApiResponse,
        strategy: 'excludeAll',
    })
    async createTripSchedule(
        @Body() dto: CreateTripScheduleDto,
    ): Promise<TripScheduleEntityApiResponse> {
        const schedule = await this.tripScheduleService.createTripSchedule(dto);

        return {
            status: 'success',
            message: 'Trip schedule created successfully',
            data: schedule,
        };
    }

    @Patch('schedules/:id')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Update a trip schedule' })
    @SwaggerResponse({
        status: 200,
        description: 'Trip schedule updated successfully',
        type: TripScheduleEntityApiResponse,
    })
    @SerializeOptions({
        type: TripScheduleEntityApiResponse,
        strategy: 'excludeAll',
    })
    async updateTripSchedule(
        @Param('id') id: string,
        @Body() dto: UpdateTripScheduleDto,
    ): Promise<TripScheduleEntityApiResponse> {
        const schedule = await this.tripScheduleService.updateTripSchedule(
            id,
            dto,
        );

        return {
            status: 'success',
            message: 'Trip schedule updated successfully',
            data: schedule,
        };
    }

    @Get('schedules')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'List all trip schedules' })
    @SwaggerResponse({
        status: 200,
        description: 'Trip schedules retrieved successfully',
        type: TripScheduleListApiResponse,
    })
    @SerializeOptions({
        type: TripScheduleListApiResponse,
        strategy: 'excludeAll',
    })
    async listSchedules(
        @Query('routeId') routeId?: string,
        @Query('isActive') isActive?: string,
    ): Promise<TripScheduleListApiResponse> {
        const schedules = await this.tripScheduleService.listSchedules({
            routeId,
            isActive: isActive ? isActive === 'true' : undefined,
        });

        return {
            status: 'success',
            message: 'Trip schedules retrieved successfully',
            data: schedules,
        };
    }

    @Get('schedules/:id')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Get schedule details' })
    @SwaggerResponse({
        status: 200,
        description: 'Schedule retrieved successfully',
        type: TripScheduleEntityApiResponse,
    })
    @SerializeOptions({
        type: TripScheduleEntityApiResponse,
        strategy: 'excludeAll',
    })
    async getScheduleById(
        @Param('id') id: string,
    ): Promise<TripScheduleEntityApiResponse> {
        const schedule = await this.tripScheduleService.getScheduleById(id);

        return {
            status: 'success',
            message: 'Schedule retrieved successfully',
            data: schedule,
        };
    }

    @Post('ad-hoc')
    @HttpCode(HttpStatus.CREATED)
    @ApiOperation({ summary: 'Create an ad-hoc trip' })
    @SwaggerResponse({
        status: 201,
        description: 'Ad-hoc trip created successfully',
        type: TripEntityApiResponse,
    })
    @SerializeOptions({ type: TripEntityApiResponse, strategy: 'excludeAll' })
    async createAdHocTrip(
        @Body() dto: CreateAdHocTripDto,
    ): Promise<TripEntityApiResponse> {
        const trip = await this.tripCreationService.createAdHocTrip(dto);

        return {
            status: 'success',
            message: 'Ad-hoc trip created successfully',
            data: trip,
        };
    }

    @Get()
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'List all trips' })
    @SwaggerResponse({
        status: 200,
        description: 'Trips retrieved successfully',
        type: TripListApiResponse,
    })
    @SerializeOptions({ type: TripListApiResponse, strategy: 'excludeAll' })
    async listTrips(
        @Query('date') date?: string,
        @Query('routeId') routeId?: string,
        @Query('status') status?: string,
    ) {
        const where: Prisma.TripWhereInput = {};

        if (date) {
            const searchDate = new Date(date);
            searchDate.setUTCHours(0, 0, 0, 0);
            const endOfDay = new Date(searchDate);
            endOfDay.setUTCHours(23, 59, 59, 999);

            where.departureTime = {
                gte: searchDate,
                lte: endOfDay,
            };
        }

        if (routeId) {
            where.routeId = routeId;
        }

        if (status) {
            where.status = status as Prisma.EnumTripStatusFilter;
        }

        const trips = await this.db.trip.findMany({
            where,
            include: {
                route: {
                    include: {
                        startLocation: true,
                        endLocation: true,
                    },
                },
                vehicle: true,
                driver: true,
                _count: {
                    select: {
                        passengerTrips: true,
                        outboundBookings: true,
                        returnBookings: true,
                    },
                },
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

    @Get(':id')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Get trip' })
    @SwaggerResponse({
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

    @Patch(':id/assign-driver')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Assign driver to trip' })
    @SwaggerResponse({
        status: 200,
        description: 'Driver assigned successfully',
        type: TripEntityApiResponse,
    })
    @SerializeOptions({ type: TripEntityApiResponse, strategy: 'excludeAll' })
    async assignDriver(
        @Param('id') id: string,
        @Body() dto: AssignDriverDto,
    ): Promise<TripEntityApiResponse> {
        const trip = await this.tripExecutionService.assignDriver(
            id,
            dto.driverId,
        );

        return {
            status: 'success',
            message: 'Driver assigned successfully',
            data: trip,
        };
    }
}
