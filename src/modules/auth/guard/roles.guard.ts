import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { Role } from '@prisma/client';
import { IS_PUBLIC_KEY } from '../decorators/public-route.decorator';
import { AdminAccessTokenClaims } from '@/types/auth';

@Injectable()
export class RolesGuard implements CanActivate {
    constructor(private reflector: Reflector) {}

    canActivate(context: ExecutionContext): boolean {
        const isPublic = this.reflector.getAllAndOverride<boolean>(
            IS_PUBLIC_KEY,
            [context.getHandler(), context.getClass()],
        );
        if (isPublic) {
            return true;
        }

        const requiredRoles = this.reflector.getAllAndOverride<Role[]>(
            ROLES_KEY,
            [context.getHandler(), context.getClass()],
        );

        if (!requiredRoles) {
            return true; // No roles specified, allow access
        }

        const { user } = context
            .switchToHttp()
            .getRequest<{ user: AdminAccessTokenClaims }>();

        if (user.role === 'SUPERADMIN') return true;

        if (!user && requiredRoles.length === 0) return true;
        return requiredRoles.some((role) => role === user.role);
    }
}
