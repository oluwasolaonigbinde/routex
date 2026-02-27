import { ClassSerializerInterceptor, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { DatabaseModule } from '@/modules/database/database.module';
import { AuthModule } from '@/modules/auth/auth.module';
import { UsersModule } from '@/modules/user/user.module';
import { BookingModule } from '@/modules/booking/booking.module';
import { DriverModule } from '@/modules/driver/driver.module';
import { AdminModule } from '@/modules/admin/admin.module';
import { WalletModule } from '@/modules/wallet/wallet.module';
import { validate } from '@/validators/env.validation';
import { NotificationModule } from '@/modules/notification/notification.module';
import { StorageModule } from '@/storage/storage.module';
import { AuthorizationRequiredFilter } from '@/common/filters/authorization-required.filter';
import { AppController } from '@/app.controller';

@Module({
    imports: [
        EventEmitterModule.forRoot(),
        ScheduleModule.forRoot(),
        ConfigModule.forRoot({
            isGlobal: true,
            validate,
        }),
        DatabaseModule,
        AuthModule,
        UsersModule,
        BookingModule,
        DriverModule,
        AdminModule,
        WalletModule,
        NotificationModule.forRoot(),
        StorageModule,
    ],
    controllers: [AppController],
    providers: [
        {
            provide: APP_INTERCEPTOR,
            useClass: ClassSerializerInterceptor,
        },
        { provide: APP_FILTER, useClass: AuthorizationRequiredFilter },
    ],
})
export class AppModule {}
