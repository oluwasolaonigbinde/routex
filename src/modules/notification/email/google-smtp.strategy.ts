import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import { render } from '@react-email/render';
import { EmailPayload, EmailStrategy } from './email.strategy.interface';
import { VerifyEmail, VerifyEmailProps } from './templates/user/VerifyEmail';
import { WelcomeEmail, WelcomeEmailProps } from './templates/user/WelcomeEmail';
import {
    PasswordResetEmail,
    PasswordResetEmailProps,
} from './templates/common/PasswordResetEmail';
import {
    PasswordChangedEmail,
    PasswordChangedEmailProps,
} from './templates/user/PasswordChangedEmail';
import { NotificationType } from '../event/enum';

@Injectable()
export class GoogleSmtpEmailStrategy implements EmailStrategy {
    private readonly transporter: Transporter;
    private readonly from: string;

    constructor(private readonly configService: ConfigService) {
        const smtpUri = this.configService.get<string>('SMTP_URI');
        if (!smtpUri) {
            throw new Error('SMTP_URI is required for GoogleSmtpEmailStrategy');
        }

        this.transporter = nodemailer.createTransport({
            host: 'smtp.gmail.com',
            port: 465,
            secure: true,
            auth: {
                user: this.configService.get<string>('SMTP_USER') || '',
                pass: this.configService.get<string>('SMTP_PASSWORD') || '',
            },
        });

        const from = this.configService.get<string>('MAIL_FROM');
        if (!from) {
            throw new Error('MAIL_FROM is required for SMTP email sending');
        }
        this.from = `No Reply<${from}>`;
    }

    async send(payload: EmailPayload): Promise<void> {
        const { subject, reactElement } = this.getEmailContent(payload);

        const html = await render(reactElement);
        const text = await render(reactElement, { plainText: true });

        await this.transporter.sendMail({
            from: this.from,
            to: payload.to,
            subject,
            html,
            text,
        });
    }

    private getEmailContent(payload: EmailPayload): {
        subject: string;
        reactElement: React.ReactElement;
    } {
        switch (payload.type) {
            case NotificationType.USER_CREATED: {
                const kind = (payload.data as { kind?: string } | undefined)
                    ?.kind;

                if (kind === 'welcome') {
                    const data = payload.data as WelcomeEmailProps;
                    return {
                        subject: 'Welcome to RouteX',
                        reactElement: WelcomeEmail({ ...data }),
                    };
                }

                const data = payload.data as VerifyEmailProps;
                return {
                    subject: 'Verify your email address',
                    reactElement: VerifyEmail({ ...data }),
                };
            }

            case NotificationType.USER_PASSWORD_RESET: {
                const data = payload.data as PasswordResetEmailProps;
                return {
                    subject: 'Reset your password',
                    reactElement: PasswordResetEmail({ ...data }),
                };
            }

            case NotificationType.ADMIN_PASSWORD_RESET: {
                const data = payload.data as PasswordResetEmailProps;
                return {
                    subject: 'Reset your password',
                    reactElement: PasswordResetEmail({ ...data }),
                };
            }

            case NotificationType.USER_PASSWORD_CHANGED: {
                const data = payload.data as PasswordChangedEmailProps;
                return {
                    subject: 'Your password has been changed',
                    reactElement: PasswordChangedEmail({ ...data }),
                };
            }

            case NotificationType.ADMIN_PASSWORD_CHANGED: {
                const data = payload.data as PasswordChangedEmailProps;
                return {
                    subject: 'Your password has been changed',
                    reactElement: PasswordChangedEmail({ ...data }),
                };
            }

            default: {
                throw new Error(
                    `Unsupported email notification type: ${payload.type}`,
                );
            }
        }
    }
}
