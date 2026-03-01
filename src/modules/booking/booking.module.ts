import { Module } from '@nestjs/common';
import { UsersModule } from '@/modules/user/user.module';
import { BookingController } from '@/modules/booking/controllers/booking.controller';
import { TripController } from '@/modules/booking/controllers/trip.user.controller';
import { ScheduleController } from '@/modules/booking/controllers/schedule.controller';
import { TripAdminController } from '@/modules/booking/controllers/trip.admin.controller';
import { RouteAdminController } from '@/modules/booking/controllers/route.admin.controller';
import { PaymentWebhookController } from '@/modules/payment/payment-webhook.controller';
import { DriverTripsController } from '@/modules/booking/controllers/trip.driver.controller';
import { BookingService } from '@/modules/booking/services/booking.service';
import { PassengerService } from '@/modules/booking/services/passenger.service';
import { TripScheduleService } from '@/modules/booking/services/trip-schedule.service';
import { TripCreationService } from '@/modules/booking/services/trip-creation.service';
import { TripExecutionService } from '@/modules/booking/services/trip-execution.service';
import { RouteService } from '@/modules/booking/services/route.service';
import { TripService } from '@/modules/booking/services/trip.service';
import { TripCronService } from '@/modules/booking/services/trip-cron.service';
import { BookingOwnershipGuard } from '@/modules/booking/guards/booking-ownership.guard';
import { DriverModule } from '@/modules/driver/driver.module';
import { TripUserService } from '@/modules/booking/services/trip.user.service';
import { WalletModule } from '@/modules/wallet/wallet.module';
import { PaymentModule } from '@/modules/payment/payment.module';
import { TripDriverService } from '@/modules/booking/services/trip.driver.service';
import { BookingCronService } from '@/modules/booking/services/booking-cron.service';

@Module({
    imports: [UsersModule, DriverModule, WalletModule, PaymentModule],
    controllers: [
        BookingController,
        TripController,
        ScheduleController,
        TripAdminController,
        RouteAdminController,
        PaymentWebhookController,
        DriverTripsController,
    ],
    providers: [
        // Services
        BookingService,
        PassengerService,
        TripScheduleService,
        TripCreationService,
        TripDriverService,
        TripExecutionService,
        TripUserService,
        RouteService,
        TripService,
        // Cron jobs
        BookingCronService,
        TripCronService,
        // Guards
        BookingOwnershipGuard,
    ],
    exports: [
        BookingService,
        PassengerService,
        TripScheduleService,
        TripCreationService,
        TripExecutionService,
        RouteService,
    ],
})
export class BookingModule {}
