import { SearchTripsDto } from '@/modules/booking/dto/trip.dto';
import { PickType } from '@nestjs/swagger';

export class UserSearchTripsDto extends PickType(SearchTripsDto, [
    'limit',
    'page',
    'status',
    'startLocationId',
    'endLocationId',
    'minDate',
    'maxDate',
] as const) {}
