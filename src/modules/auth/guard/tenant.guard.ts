import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Tenant } from '@prisma/client';
import { TENANT_KEY } from '../decorators/tenant.decorator';
import { IS_PUBLIC_KEY } from '../decorators/public-route.decorator';
import { AccessTokenDTO } from '@/types/auth';

@Injectable()
export class TenantGuard implements CanActivate {
    constructor(private reflector: Reflector) {}

    canActivate(context: ExecutionContext): boolean {
        const isPublic = this.reflector.getAllAndOverride<boolean>(
            IS_PUBLIC_KEY,
            [context.getHandler(), context.getClass()],
        );
        if (isPublic) {
            return true;
        }

        const tenant = this.reflector.getAllAndOverride<Tenant>(TENANT_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);

        if (!tenant) {
            return true; // No tenant specified, allow access
        }

        console.log('tenant');

        const { user } = context
            .switchToHttp()
            .getRequest<{ user: AccessTokenDTO }>();

        return tenant === user.tenant;
    }
}
