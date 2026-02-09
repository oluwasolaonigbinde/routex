import { ClassSerializerInterceptor, Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './modules/database/database.module';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { AuthModule } from './modules/auth/auth.module';
import { validate } from './validators/env.validation';
import { EventEmitterModule } from '@nestjs/event-emitter';
// import { NotificationModule } from './modules/notification/notification.module';
import { UsersModule } from './modules/user/user.module';
import { AuthorizationRequiredFilter } from './common/filters/authorization-required.filter';
import { StorageModule } from './storage/storage.module';
import { NotificationModule } from './modules/notification/notification.module';

@Module({
    imports: [
        EventEmitterModule.forRoot(),
        ConfigModule.forRoot({
            isGlobal: true,
            validate,
        }),
        DatabaseModule,
        AuthModule,
        UsersModule,
        // AdminModule,
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
