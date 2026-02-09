import { PaginatedQuery } from '@/util/dto';
import { IntersectionType, PartialType, PickType } from '@nestjs/swagger';
import { Notification } from '../entity/notifcation.entity';
import { Transform } from 'class-transformer';

export class GetNotificationsDto extends IntersectionType(
    PaginatedQuery,
    PartialType(PickType(Notification, ['isRead', 'type', 'userId'] as const)),
) {
    @Transform(({ value }: { value: string }) => {
        if (value === 'true') return true;
        if (value === 'false') return false;
        return value;
    })
    isRead?: boolean | undefined;
}
