import { Injectable, Logger, Optional, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
// import { ResendEmailStrategy } from '../email/resend.strategy';
import { EmailPayload, EmailStrategy } from '../email/email.strategy.interface';
import { GoogleSmtpEmailStrategy } from '../email/google-smtp.strategy';

@Injectable()
export class EmailService {
    private readonly logger = new Logger(EmailService.name);

    constructor(
        private readonly configService: ConfigService,
        @Optional()
        @Inject(GoogleSmtpEmailStrategy)
        private readonly googleSmtp: GoogleSmtpEmailStrategy | null,
    ) {}

    private getStrategy(): EmailStrategy | null {
        const provider =
            this.configService.get<string>('EMAIL_PROVIDER')?.toLowerCase() ||
            'resend';

        if (provider === 'smtp' && this.googleSmtp) {
            return this.googleSmtp;
        }

        return null;
    }

    async sendEmail(input: EmailPayload) {
        const strategy = this.getStrategy();

        if (!strategy) {
            this.logger.warn('No email provider configured. Email not sent.');
            return;
        }

        return strategy.send(input);
    }
}
