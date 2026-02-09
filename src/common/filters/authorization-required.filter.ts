import {
    ArgumentsHost,
    Catch,
    ExceptionFilter,
    Injectable,
} from '@nestjs/common';
import { Response } from 'express';
import {
    ClassTransformOptions,
    instanceToPlain,
    plainToInstance,
} from 'class-transformer';
import { AuthorizationRequiredException } from '../exception/exception';
import { IntentEntity } from '@/modules/auth/entities/auth.entity';

/**
 * Standard response schema for operations requiring authorization intents
 *
 * @description
 * When an operation requires step-up authentication, the API returns this structure:
 * - The operation is created in PENDING state
 * - An authorization intent is generated with expiry
 * - Client must call POST /security/intents/:intentId/authorize with credentials
 * - After successful authorization, operation executes automatically via event handler
 *
 * @example
 * {
 *   "status": "pending",
 *   "message": "Authorization required. Please provide your PIN to proceed.",
 *   "data": {
 *     "operation": { ...operationDetails },
 *     "intent": {
 *       "id": "intent-uuid",
 *       "type": "AUTHORIZE_LIQUIDATION",
 *       "requiredAuthMethods": ["PIN"],
 *       "minAuthSatisfied": 1,
 *       "expiresAt": "2026-02-01T15:05:00Z",
 *       "status": "CREATED"
 *     }
 *   }
 * }
 */

@Injectable()
@Catch(AuthorizationRequiredException)
export class AuthorizationRequiredFilter implements ExceptionFilter {
    catch(exception: AuthorizationRequiredException, host: ArgumentsHost) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse<Response>();

        const transformOptions: ClassTransformOptions = {
            strategy: 'excludeAll',
            enableImplicitConversion: true,
            excludeExtraneousValues: true,
        };

        // Transform the operation using the provided DTO class
        const OperationDtoClass = exception.responseDtoClass;
        let transformedOperation: unknown;

        if (
            OperationDtoClass &&
            typeof OperationDtoClass === 'function' &&
            exception.payload.operation
        ) {
            // First convert to plain to handle Prisma Decimals, then back to instance
            const plainOperation = instanceToPlain(
                Object.assign(
                    new OperationDtoClass() as object,
                    exception.payload.operation,
                ),
            );
            const operationInstance = plainToInstance(
                OperationDtoClass,
                plainOperation,
                transformOptions,
            );
            transformedOperation = instanceToPlain(
                operationInstance,
                transformOptions,
            );
        } else {
            transformedOperation = exception.payload.operation;
        }

        // Transform the intent using IntentEntity
        let transformedIntent: unknown;
        if (exception.payload.intent) {
            const intentInstance = plainToInstance(
                IntentEntity,
                exception.payload.intent,
                transformOptions,
            );
            transformedIntent = instanceToPlain(
                intentInstance,
                transformOptions,
            );
        } else {
            transformedIntent = exception.payload.intent;
        }

        response.status(exception.getStatus()).json({
            status: 'AUTHORIZATION_REQUIRED',
            message: exception.message,
            data: {
                operation: transformedOperation,
                intent: transformedIntent,
            },
        });
    }
}
