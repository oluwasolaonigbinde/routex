import { AUTHORIZATION_STRATEGY_REGISTRY } from '@/modules/auth/authorization.service';
import { Module } from '@nestjs/common';
import { AuthAuthorizationRegistry } from './defaut.auhtorization-registry';

@Module({
    providers: [
        {
            provide: AUTHORIZATION_STRATEGY_REGISTRY,
            useFactory: () => {
                return new AuthAuthorizationRegistry();
            },
        },
    ],
    exports: [AUTHORIZATION_STRATEGY_REGISTRY],
})
export class AuthAuthorizationModule {}
