import { PickType } from '@nestjs/swagger';
import { GetNotificationsDto } from './notification.dto';

export class GetAdminNotificationsDto extends PickType(GetNotificationsDto, [
    'isRead',
    'type',
    'limit',
    'page',
] as const) {}
