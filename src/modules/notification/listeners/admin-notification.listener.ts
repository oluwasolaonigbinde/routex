// import { Injectable } from '@nestjs/common';
// import { OnEvent } from '@nestjs/event-emitter';
// import { VerificationTokenService } from '@/modules/verification-token/verification-token.service';
// import { NotificationService } from '../services/notification.service';
// import { ConfigService } from '@nestjs/config';
// import { DatabaseService } from '@/modules/database/database.service';
// import { AdminCreatedEvent } from '@/modules/admin/event/admin-created';
// import { NotificationType } from '@/common/event/event.enum';
// import { VerifyAdminEmailProps } from '../email/templates/admin/VerifyAdminEmail';
// import { AdminPasswordResetRequestedEvent } from '@/modules/admin/event/admin-password-reset-requested';
// import { PasswordResetEmailProps } from '../email/templates/common/PasswordResetEmail';
// import { AdminPasswordChangedEvent } from '@/modules/admin/event/admin-password-changed';
// import { PasswordChangedEmailProps } from '../email/templates/user/PasswordChangedEmail';

// @Injectable()
// export class AdminNotificationListener {
//     constructor(
//         private readonly notificationService: NotificationService,
//         private readonly databaseService: DatabaseService,
//         private readonly configService: ConfigService,
//         private readonly verificationService: VerificationTokenService,
//     ) {}

//     @OnEvent('admin.created', { async: true })
//     async handleAdminCreatedEvent(event: AdminCreatedEvent) {
//         const emailVerificationToken =
//             await this.verificationService.createToken({
//                 type: 'EMAIL_VERIFICATION',
//                 email: event.email,
//                 userId: event.adminId,
//                 tokenType: 'otp',
//             });

//         // In - app notification
//         await this.notificationService.sendInAppNotification({
//             userId: event.adminId,
//             type: NotificationType.ADMIN_CREATED,
//             title: 'Welcome to the Admin Team',
//             message: `Hello ${event.firstName}, your admin account has been created successfully.`,
//             tenant: 'ADMIN',
//         });

//         // Email notification
//         await this.notificationService.sendEmailNotification({
//             to: event.email,
//             type: NotificationType.ADMIN_CREATED,

//             data: {
//                 firstName: event.firstName,
//                 verificationToken: emailVerificationToken.rawToken,
//                 expiresAt: emailVerificationToken.expiresAt,
//             } as VerifyAdminEmailProps,
//         });
//     }

//     @OnEvent('admin.password_reset_requested', { async: true })
//     async handleAdminPasswordResetRequestedEvent(
//         event: AdminPasswordResetRequestedEvent,
//     ) {
//         const resetToken = await this.verificationService.createToken({
//             type: 'PASSWORD_RESET',
//             email: event.email,
//             userId: event.adminId,
//             tokenType: 'otp',
//         });

//         await this.notificationService.sendEmailNotification({
//             to: event.email,
//             type: NotificationType.ADMIN_PASSWORD_RESET,
//             data: {
//                 firstName: event.firstName,
//                 resetToken: resetToken.rawToken,
//                 expiresAt: resetToken.expiresAt,
//             } as PasswordResetEmailProps,
//         });
//     }

//     @OnEvent('admin.password_changed', { async: true })
//     async handleAdminPasswordChangedEvent(event: AdminPasswordChangedEvent) {
//         await this.notificationService.sendEmailNotification({
//             to: event.email,
//             type: NotificationType.ADMIN_PASSWORD_CHANGED,
//             data: {
//                 firstName: event.firstName,
//             } as PasswordChangedEmailProps,
//         });
//     }
// }
