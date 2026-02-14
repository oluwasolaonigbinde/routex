import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { BookingModule } from '../booking/booking.module';
import { DriverController } from './driver.controller';

@Module({
    imports: [DatabaseModule, BookingModule],
    controllers: [DriverController],
})
export class DriverModule {}
