import { SetMetadata } from '@nestjs/common';
import { AuthorizationMethod } from '@prisma/client';

export const ALLOWED_AUTH_METHODS_KEY = 'allowedAuthMethods';

export const AllowedAuthorizationMethods = (
    ...methods: AuthorizationMethod[]
) => SetMetadata(ALLOWED_AUTH_METHODS_KEY, methods);
