import { AuthModule } from '@/modules/auth/auth.module';
import { DriversController } from '@/modules/driver/driver.controller';
import { DriverService } from '@/modules/driver/driver.service';
import { Module } from '@nestjs/common';

@Module({
    imports: [AuthModule],
    providers: [DriverService],
    controllers: [DriversController],
    exports: [DriverService],
})
export class DriverModule {}
