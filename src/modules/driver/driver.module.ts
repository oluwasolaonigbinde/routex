import { AuthModule } from '@/modules/auth/auth.module';
import { BookingModule } from '@/modules/booking/booking.module';
import { DriversController } from '@/modules/driver/driver.controller';
import { DriverService } from '@/modules/driver/driver.service';
import { Module } from '@nestjs/common';

@Module({
    imports: [BookingModule, AuthModule],
    providers: [DriverService],
    controllers: [DriversController],
})
export class DriverModule {}
