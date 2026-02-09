import { AUTHORIZATION_STRATEGY_REGISTRY } from '@/modules/auth/authorization.service';
import { forwardRef, Module } from '@nestjs/common';
import { UserAuthorizationRegistry } from './user.authoriaztion-registry';
import { UsersModule } from '../user.module';

@Module({
    imports: [forwardRef(() => UsersModule)],
    providers: [
        {
            provide: AUTHORIZATION_STRATEGY_REGISTRY,
            useFactory: () => {
                return new UserAuthorizationRegistry();
            },
        },
    ],
    exports: [AUTHORIZATION_STRATEGY_REGISTRY],
})
export class UserAuthorizationModule {}
