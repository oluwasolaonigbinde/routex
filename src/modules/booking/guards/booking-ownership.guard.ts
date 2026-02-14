import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { DatabaseService } from '@/modules/database/database.service';
import { UnauthorizedBookingAccessException } from '../exceptions/booking.exception';
import { AccessTokenDTO } from '@/types/auth';

@Injectable()
export class BookingOwnershipGuard implements CanActivate {
    constructor(private readonly db: DatabaseService) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest();
        const user = request.user as AccessTokenDTO;
        const bookingId = request.params.id || request.params.bookingId;

        if (!bookingId) {
            return true; // Let controller handle missing ID
        }

        const booking = await this.db.booking.findUnique({
            where: { id: bookingId },
            select: { userId: true },
        });

        if (!booking) {
            return true; // Let controller return 404
        }

        if (booking.userId !== user.sub) {
            throw new UnauthorizedBookingAccessException();
        }

        return true;
    }
}
