import { NotificationType } from '../event/enum';

export interface SendEmailInput {
    to: string;
    subject: string;
    type: NotificationType;
    variables: Record<string, string | number>;
}

export type EmailPayload = {
    type: NotificationType;
    to: string;
    data: Record<string, any>;
};

export interface EmailStrategy {
    /**
     * Sends a single transactional email.
     * Implementations must throw on failure.
     */
    send(input: EmailPayload): Promise<void>;
}
