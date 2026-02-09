import { SetMetadata } from '@nestjs/common';
import { Tenant as TenantEnum } from '@prisma/client';

export const TENANT_KEY = 'tenants';
export const Tenant = (tenant: TenantEnum) => SetMetadata(TENANT_KEY, tenant);
