import { PickType } from '@nestjs/swagger';
import { GetNotificationsDto } from './notification.dto';

export class GetUserNotificationsDto extends PickType(GetNotificationsDto, [
    'isRead',
    'type',
    'limit',
    'page',
] as const) {}
