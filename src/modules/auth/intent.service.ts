import {
    AuthorizationMethod,
    Intent,
    IntentStatus,
    IntentType,
    Prisma,
} from '@prisma/client';
import {
    AUTHORIZATION_STRATEGY_REGISTRY,
    AuthorizationStrategyRegistry,
} from './authorization.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { IntentAuthorizedEvent } from './event/intent-authorized.event';
import {
    BadRequestException,
    Inject,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

export interface CreateIntentParams<TPayload extends Record<string, unknown>> {
    userId: string;

    type: IntentType;

    payload: TPayload;

    authorization: {
        requiredMethods: AuthorizationMethod[];
        minSatisfied: number;
    };

    expiresInSeconds: number;

    /**
     * Optional metadata for observability, not authorization
     * (e.g. source = "mobile", riskScore = 0.42)
     */
    meta?: Record<string, unknown>;
}

@Injectable()
export class IntentService {
    constructor(
        private readonly databaseService: DatabaseService,
        @Inject(AUTHORIZATION_STRATEGY_REGISTRY)
        private readonly authorizationStrategyRegistry: AuthorizationStrategyRegistry,
        private readonly eventEmitter: EventEmitter2,
    ) {}

    async createIntent<TPayload extends Record<string, unknown>>(
        params: CreateIntentParams<TPayload>,
    ): Promise<Intent> {
        const expiresAt = new Date(Date.now() + params.expiresInSeconds * 1000);

        // Defensive checks (generic, not domain-specific)
        if (params.authorization.minSatisfied < 1) {
            throw new Error('INVALID_AUTH_POLICY');
        }

        if (
            params.authorization.minSatisfied >
            params.authorization.requiredMethods.length
        ) {
            throw new Error('INVALID_AUTH_POLICY');
        }

        return this.databaseService.intent.create({
            data: {
                userId: params.userId,
                type: params.type,
                status: IntentStatus.CREATED,

                payload: params.payload as Prisma.InputJsonValue,

                requiredAuthMethods: params.authorization.requiredMethods,
                minAuthSatisfied: params.authorization.minSatisfied,

                expiresAt,

                // Optional metadata if your schema includes it
                meta: params.meta as Prisma.InputJsonValue,
            },
        });
    }

    private assertNotExpired(intent: Intent) {
        if (intent.expiresAt.getTime() < Date.now()) {
            throw new BadRequestException(
                `Intent with ID "${intent.id}" has expired`,
            );
        }
    }

    private assertNotAuthorized(intent: Intent) {
        if (intent.status === IntentStatus.AUTHORIZED) {
            throw new BadRequestException(
                `Intent with ID "${intent.id}" has already been authorized`,
            );
        }
    }

    private assertMethodAllowed(intent: Intent, method: AuthorizationMethod) {
        if (!intent.requiredAuthMethods.includes(method)) {
            throw new BadRequestException(
                `Authorization method "${method}" is not allowed for intent with ID "${intent.id}"`,
            );
        }
    }

    public async getIntent(intentId: string, userId: string): Promise<Intent> {
        const intent = await this.databaseService.intent.findUnique({
            where: {
                id: intentId,
                userId: userId,
            },
        });

        if (!intent) {
            throw new NotFoundException(
                `Intent with ID "${intentId}" not found`,
            );
        }

        return intent;
    }
    private async isAuthorizationSatisfied(intent: Intent): Promise<boolean> {
        const successfulAttempts =
            await this.databaseService.authorizationAttempt.findMany({
                where: {
                    intentId: intent.id,
                    status: 'SUCCESS',
                },
                select: {
                    method: true,
                },
            });

        const satisfiedMethods = successfulAttempts.map((a) => a.method);
        const count = satisfiedMethods.filter((m) =>
            intent.requiredAuthMethods.includes(m),
        ).length;

        return count >= intent.minAuthSatisfied;
    }

    async authorizeIntent(params: {
        intentId: string;
        userId: string;
        method: AuthorizationMethod;
        credential: unknown;
    }) {
        const intent = await this.getIntent(params.intentId, params.userId);

        this.assertNotExpired(intent);
        this.assertNotAuthorized(intent);
        this.assertMethodAllowed(intent, params.method);

        const strategy = this.authorizationStrategyRegistry.get(params.method);

        const result = await strategy.authorize({
            intent,
            userId: params.userId,
            credential: params.credential,
            context: {
                intentId: intent.id,
                type: intent.type,
            },
        });

        // Always record the attempt (success or failure) before throwing any errors
        await this.databaseService.authorizationAttempt.create({
            data: {
                intentId: intent.id,
                method: params.method,
                status: result.success ? 'SUCCESS' : 'FAILURE',
            },
        });

        if (!result.success) {
            throw new BadRequestException(
                result.reason || 'Authorization failed',
            );
        }

        // Only use transaction for the critical section after successful authorization
        if (await this.isAuthorizationSatisfied(intent)) {
            await this.databaseService.intent.update({
                where: { id: intent.id },
                data: {
                    status: 'AUTHORIZED',
                    authorizedAt: new Date(),
                },
            });

            this.eventEmitter.emit(
                `intent.authorized.${intent.type}`,
                new IntentAuthorizedEvent(
                    intent.id,
                    intent.type,
                    intent.userId,
                ),
            );
        }

        return this.getIntent(intent.id, params.userId);
    }
}
