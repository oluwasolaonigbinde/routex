import { Injectable } from '@nestjs/common';
import { InAppNotificationService } from './in-app-notification.service';
import { CreateInAppNotificationDTO } from '../dto/create-in-app-notification';
import { EmailService } from './email.service';
import { EmailPayload } from '../email/email.strategy.interface';

@Injectable()
export class NotificationService {
    constructor(
        private readonly emailService: EmailService,
        private readonly inAppNotificationService: InAppNotificationService,
    ) {}

    async sendInAppNotification(input: CreateInAppNotificationDTO) {
        await this.inAppNotificationService.create(input);
    }

    async sendEmailNotification(input: EmailPayload | EmailPayload[]) {
        const payloads = Array.isArray(input) ? input : [input];
        await Promise.all(
            payloads.map((payload) => this.emailService.sendEmail(payload)),
        );
    }
}
