import { Injectable } from '@nestjs/common';
import { AuthorizationMethod, Intent, IntentType } from '@prisma/client';

export const AUTHORIZATION_STRATEGY_REGISTRY = Symbol(
    'AUTHORIZATION_STRATEGY_REGISTRY',
);

export interface AuthorizationContext {
    intentId: string;
    type: IntentType;
}

export interface AuthorizationResult {
    success: boolean;

    reason?: string;

    meta?: Record<string, unknown>;
}

export interface AuthorizationStrategyParams<TParam = unknown> {
    intent: Intent;
    userId: string;
    credential: TParam;
    context: AuthorizationContext;
}

export interface AuthorizationStrategy {
    readonly method: AuthorizationMethod;

    authorize(
        params: AuthorizationStrategyParams,
    ): Promise<AuthorizationResult>;
}

@Injectable()
export class AuthorizationStrategyRegistry {
    private readonly strategies = new Map<
        AuthorizationMethod,
        AuthorizationStrategy
    >();

    constructor(strategies: AuthorizationStrategy[]) {
        for (const strategy of strategies) {
            this.strategies.set(strategy.method, strategy);
        }
    }

    get(method: AuthorizationMethod): AuthorizationStrategy {
        const strategy = this.strategies.get(method);

        if (!strategy) {
            throw new Error(`Unsupported authorization method: ${method}`);
        }

        return strategy;
    }
}
