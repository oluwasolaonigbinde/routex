import { Module, DynamicModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { EmailService } from './services/email.service';
import { InAppNotificationService } from './services/in-app-notification.service';
import { NotificationService } from './services/notification.service';
import { GoogleSmtpEmailStrategy } from './email/google-smtp.strategy';
import { VerificationTokenModule } from '../verification-token/verification-token.module';
import { DatabaseModule } from '../database/database.module';
import { UserNotificationListener } from './listeners/user-notification.listener';
import { BookingNotificationListener } from './listeners/booking-notification.listener';
// import { NotificationAdminController } from './controllers/notification.admin.controller';
import { NotificationUserController } from './controllers/notification.user.controller';

@Module({})
export class NotificationModule {
    static forRoot(): DynamicModule {
        return {
            module: NotificationModule,
            imports: [VerificationTokenModule, DatabaseModule, ConfigModule],
            providers: [
                EmailService,
                InAppNotificationService,
                NotificationService,
                // AdminNotificationListener,
                UserNotificationListener,
                BookingNotificationListener,
                // {
                //     provide: ResendEmailStrategy,
                //     useFactory: (configService: ConfigService) => {
                //         const apiKey =
                //             configService.get<string>('RESEND_API_KEY');
                //         const provider =
                //             configService
                //                 .get<string>('EMAIL_PROVIDER')
                //                 ?.toLowerCase() || 'resend';

                //         // Only instantiate if Resend is the provider and API key exists
                //         if (provider === 'resend' && apiKey) {
                //             return new ResendEmailStrategy(configService);
                //         }
                //         return null;
                //     },
                //     inject: [ConfigService],
                // },
                {
                    provide: GoogleSmtpEmailStrategy,
                    useFactory: (configService: ConfigService) => {
                        const provider = configService
                            .get<string>('EMAIL_PROVIDER')
                            ?.toLowerCase();

                        // Only instantiate if SMTP is the provider
                        if (provider === 'smtp') {
                            return new GoogleSmtpEmailStrategy(configService);
                        }
                        return null;
                    },
                    inject: [ConfigService],
                },
            ],
            controllers: [
                // NotificationAdminController,
                NotificationUserController,
            ],
        };
    }
}
