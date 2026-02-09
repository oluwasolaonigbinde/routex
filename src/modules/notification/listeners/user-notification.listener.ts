import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { NotificationService } from '../services/notification.service';
import { VerificationTokenService } from '@/modules/verification-token/verification-token.service';
import { ConfigService } from '@nestjs/config';
import { VerifyEmailProps } from '../email/templates/user/VerifyEmail';
import { WelcomeEmailProps } from '../email/templates/user/WelcomeEmail';
import { PasswordResetEmailProps } from '../email/templates/common/PasswordResetEmail';
import { PasswordChangedEmailProps } from '../email/templates/user/PasswordChangedEmail';
import { UserPasswordChangedEvent } from '@/modules/user/events/user-password-changed.event';
import { NotificationType } from '../event/enum';
import { UserCreatedEvent } from '@/modules/user/events/user-created.event';
import { UserPasswordResetRequestedEvent } from '@/modules/user/events/user-password-reset-requested.event';

@Injectable()
export class UserNotificationListener {
    constructor(
        private readonly notificationService: NotificationService,
        private readonly configService: ConfigService,
        private readonly verificationService: VerificationTokenService,
    ) {}

    @OnEvent('user.created', { async: true })
    async handleUserCreatedEvent(event: UserCreatedEvent) {
        const emailVerificationToken =
            await this.verificationService.createToken({
                type: 'EMAIL_VERIFICATION',
                email: event.email,
                userId: event.userId,
                tokenType: 'otp',
            });

        await this.notificationService.sendInAppNotification({
            userId: event.userId,
            type: NotificationType.USER_CREATED,
            title: 'Welcome to RouteX',
            message: `Hello ${event.firstName}, your account has been created successfully.`,
            tenant: 'USER',
        });

        await this.notificationService.sendEmailNotification([
            {
                to: event.email,
                type: NotificationType.USER_CREATED,
                data: {
                    kind: 'verify',
                    firstName: event.firstName,
                    verificationToken: emailVerificationToken.rawToken,
                    expiresAt: emailVerificationToken.expiresAt,
                } as VerifyEmailProps,
            },
            {
                to: event.email,
                type: NotificationType.USER_CREATED,
                data: {
                    kind: 'welcome',
                    firstName: event.firstName,
                    websiteUrl: this.configService.get<string>('WEB_DOMAIN')!,
                } as WelcomeEmailProps,
            },
        ]);
    }

    @OnEvent('user.password_reset_requested', { async: true })
    async handleUserPasswordResetRequestedEvent(
        event: UserPasswordResetRequestedEvent,
    ) {
        const resetToken = await this.verificationService.createToken({
            type: 'PASSWORD_RESET',
            email: event.email,
            userId: event.userId,
            tokenType: 'otp',
        });

        await this.notificationService.sendEmailNotification({
            to: event.email,
            type: NotificationType.USER_PASSWORD_RESET,
            data: {
                firstName: event.firstName,
                resetToken: resetToken.rawToken,
                expiresAt: resetToken.expiresAt,
            } as PasswordResetEmailProps,
        });
    }

    @OnEvent('user.password_changed', { async: true })
    async handleUserPasswordChangedEvent(event: UserPasswordChangedEvent) {
        await this.notificationService.sendEmailNotification({
            to: event.email,
            type: NotificationType.USER_PASSWORD_CHANGED,
            data: {
                firstName: event.firstName,
            } as PasswordChangedEmailProps,
        });
    }
}
