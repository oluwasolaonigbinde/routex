import { PaginatedQuery } from '@/util/dto';
import { SearchTripsDto } from '@/modules/booking/dto/trip.dto';
import { PickType } from '@nestjs/swagger';

export class DriverSearchPassengerTripsDto extends PaginatedQuery {}

export class DriverSearchTripsDto extends PickType(SearchTripsDto, [
    'limit',
    'page',
    'status',
    'startLocationId',
    'endLocationId',
    'minDate',
    'maxDate',
] as const) {}
