import {
    CanActivate,
    ExecutionContext,
    ForbiddenException,
    Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthorizationMethod } from '@prisma/client';
import { ALLOWED_AUTH_METHODS_KEY } from '../decorators/allowed-auth-methods.decorator';
import { Request } from 'express';

@Injectable()
export class AuthorizationMethodGuard implements CanActivate {
    constructor(private readonly reflector: Reflector) {}

    canActivate(context: ExecutionContext): boolean {
        const allowedMethods =
            this.reflector.get<AuthorizationMethod[]>(
                ALLOWED_AUTH_METHODS_KEY,
                context.getHandler(),
            ) ||
            this.reflector.get<AuthorizationMethod[]>(
                ALLOWED_AUTH_METHODS_KEY,
                context.getClass(),
            );

        if (!allowedMethods || allowedMethods.length === 0) {
            return true; // no restriction
        }

        const request = context
            .switchToHttp()
            .getRequest<Request<any, any, { method?: string }>>();
        const method = request.body?.method;

        if (
            !method ||
            !allowedMethods.includes(method as AuthorizationMethod)
        ) {
            throw new ForbiddenException(
                `Authorization method '${method || 'undefined'}' is not allowed for this endpoint. Allowed methods: ${allowedMethods.join(', ')}`,
            );
        }

        return true;
    }
}
