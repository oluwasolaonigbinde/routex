import {
    ExecutionContext,
    ForbiddenException,
    Injectable,
    UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { Observable } from 'rxjs';
import { IS_PUBLIC_KEY } from '../decorators/public-route.decorator';
import { SCOPES_KEY } from '../decorators/scopes.decorator';
import { AccessTokenDTO } from '@/types/auth';

@Injectable()
export class AccessTokenGuard extends AuthGuard('jwt') {
    constructor(private reflector: Reflector) {
        super();
    }

    canActivate(
        context: ExecutionContext,
    ): boolean | Promise<boolean> | Observable<boolean> {
        const isPublic = this.reflector.getAllAndOverride<boolean>(
            IS_PUBLIC_KEY,
            [context.getHandler(), context.getClass()],
        );

        if (isPublic) {
            return true;
        }

        return super.canActivate(context);
    }

    handleRequest<TUser extends AccessTokenDTO = AccessTokenDTO>(
        err: any,
        user: TUser,
        info: any,
        context: ExecutionContext,
    ): TUser {
        if (err || !user) {
            throw err || new UnauthorizedException('Unauthorized');
        }

        // Check if the route requires specific scopes
        const requiredScopes = this.reflector.getAllAndOverride<string[]>(
            SCOPES_KEY,
            [context.getHandler(), context.getClass()],
        );

        const tokenScopes = user.scope;

        // If token has no scopes defined, treat it as a general token with full access
        if (!tokenScopes || tokenScopes.length === 0) {
            return user;
        }

        // If token has scopes but route doesn't define any, deny access
        // (scoped tokens can only access routes with explicit scope requirements)
        if (!requiredScopes || requiredScopes.length === 0) {
            throw new ForbiddenException(
                'This route does not accept scoped tokens. Use a general token instead.',
            );
        }

        // Check if the token has at least one of the required scopes
        const hasRequiredScope = requiredScopes.some((scope) =>
            tokenScopes.includes(scope),
        );

        if (!hasRequiredScope) {
            throw new ForbiddenException(
                `Insufficient permissions. Required scopes: ${requiredScopes.join(', ')}`,
            );
        }

        return user;
    }
}
