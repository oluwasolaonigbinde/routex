import { Module } from '@nestjs/common';
// import { AdminNotificationListener } from './admin-notification.listener';
import { UserNotificationListener } from './user-notification.listener';

@Module({
    providers: [
        // AdminNotificationListener,
        UserNotificationListener,
    ],
})
export class ListenerModule {}
