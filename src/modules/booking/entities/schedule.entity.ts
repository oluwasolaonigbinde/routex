import { ExposeAll } from '@/util/decorator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { TripScheduleEntity } from './trip.entity';
import type { PaginatedResponse } from '@/types';

// ========== Paginated Schedule List ==========

type SchedulePaginatedResponse = PaginatedResponse<TripScheduleEntity>['data'];

@ExposeAll()
class ScheduleListResult implements SchedulePaginatedResponse {
    @ApiProperty({ type: Number })
    totalCount: number;

    @ApiProperty({ type: Number })
    page: number;

    @ApiProperty({ type: Number })
    limit: number;

    @ApiProperty({ type: Number })
    perPage: number;

    @ApiProperty({
        type: [TripScheduleEntity],
        description: 'List of trip schedules',
    })
    @Type(() => TripScheduleEntity)
    results: TripScheduleEntity[];
}

@ExposeAll()
export class ScheduleListApiResponse implements PaginatedResponse<TripScheduleEntity> {
    @ApiProperty({
        type: String,
        enum: ['pending', 'success', 'failed', 'processing'],
    })
    status: 'pending' | 'success' | 'failed' | 'processing';

    @ApiProperty({ type: String })
    message: string;

    @ApiProperty({ type: ScheduleListResult })
    @Type(() => ScheduleListResult)
    data: ScheduleListResult;
}

// Re-export from trip.entity for convenience
export {
    TripScheduleEntity,
    TripScheduleEntityApiResponse,
} from './trip.entity';
