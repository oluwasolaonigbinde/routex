import { IntentType } from '@prisma/client';

export class IntentAuthorizedEvent {
    constructor(
        public readonly intentId: string,
        public readonly intentType: IntentType,
        public readonly userId: string,
        public readonly correlationId?: string,
    ) {}
}
