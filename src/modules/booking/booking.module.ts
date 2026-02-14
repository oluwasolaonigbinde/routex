import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from '../database/database.module';

// Services
import { BookingService } from './services/booking.service';
import { PassengerService } from './services/passenger.service';
import { PaymentService } from './services/payment.service';
import { TripScheduleService } from './services/trip-schedule.service';
import { TripCreationService } from './services/trip-creation.service';
import { TripExecutionService } from './services/trip-execution.service';
import { BoardingService } from './services/boarding.service';
import { RouteService } from './services/route.service';

// Controllers
import { BookingController } from './controllers/booking.controller';
import { TripController } from './controllers/trip.controller';
import { PaymentWebhookController } from './controllers/payment-webhook.controller';
import { TripAdminController } from './controllers/trip.admin.controller';
import { RouteAdminController } from './controllers/route.admin.controller';

// Guards
import { BookingOwnershipGuard } from './guards/booking-ownership.guard';
import { DriverAssignmentGuard } from './guards/driver-assignment.guard';
import { TripService } from './services/trip.service';

@Module({
    imports: [
        DatabaseModule,
        ConfigModule,
        JwtModule.register({}), // Will use ConfigService for secrets
    ],
    controllers: [
        BookingController,
        TripController,
        TripAdminController,
        RouteAdminController,
        PaymentWebhookController,
    ],
    providers: [
        // Services
        BookingService,
        PassengerService,
        PaymentService,
        TripScheduleService,
        TripCreationService,
        TripExecutionService,
        BoardingService,
        RouteService,
        TripService,
        // Guards
        BookingOwnershipGuard,
        DriverAssignmentGuard,
    ],
    exports: [
        BookingService,
        PassengerService,
        PaymentService,
        TripScheduleService,
        TripCreationService,
        TripExecutionService,
        BoardingService,
        RouteService,
    ],
})
export class BookingModule {}
