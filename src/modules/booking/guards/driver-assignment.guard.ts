import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { DatabaseService } from '@/modules/database/database.service';
import { DriverNotAssignedException } from '../exceptions/booking.exception';
import { AccessTokenDTO } from '@/types/auth';

@Injectable()
export class DriverAssignmentGuard implements CanActivate {
    constructor(private readonly db: DatabaseService) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest();
        const user = request.user as AccessTokenDTO;
        const tripId = request.params.tripId || request.params.id;

        if (!tripId) {
            return true; // Let controller handle missing ID
        }

        const trip = await this.db.trip.findUnique({
            where: { id: tripId },
            select: { driverId: true },
        });

        if (!trip) {
            return true; // Let controller return 404
        }

        if (trip.driverId !== user.sub) {
            throw new DriverNotAssignedException();
        }

        return true;
    }
}
