import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Tenant } from '@prisma/client';
import { AccessTokenDTO } from '@/types/auth';
import { IS_PUBLIC_KEY } from '@/modules/auth/decorators/public-route.decorator';
import { TENANT_KEY } from '@/modules/auth/decorators/tenant.decorator';

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

        const { user } = context
            .switchToHttp()
            .getRequest<{ user: AccessTokenDTO }>();

        return tenant === user.tenant;
    }
}
