import {
    Controller,
    Get,
    Query,
    Param,
    HttpCode,
    HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { TripScheduleService } from '../services/trip-schedule.service';
import { SearchSchedulesDto } from '../dto/trip.dto';
import { SerializeOptions } from '@/util/decorator';
import {
    ScheduleListApiResponse,
    TripScheduleEntityApiResponse,
} from '../entities/schedule.entity';
import { PaginatedResponse } from '@/types';
import { TripSchedule } from '@prisma/client';

@Controller('trips/schedules')
@ApiTags('Trip Schedules')
export class ScheduleController {
    constructor(private readonly tripScheduleService: TripScheduleService) {}

    @Get('search')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Search for available trip schedules' })
    @ApiResponse({
        status: 200,
        description: 'Schedules found successfully',
        type: ScheduleListApiResponse,
    })
    @SerializeOptions({
        type: ScheduleListApiResponse,
        strategy: 'excludeAll',
    })
    async searchSchedules(
        @Query() query: SearchSchedulesDto,
    ): Promise<PaginatedResponse<TripSchedule>> {
        const schedules = await this.tripScheduleService.searchSchedules(query);

        return {
            status: 'success',
            message: `Found ${schedules.results.length} available schedules`,
            data: schedules,
        };
    }

    @Get(':id')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Get trip schedule details' })
    @ApiResponse({
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
}
