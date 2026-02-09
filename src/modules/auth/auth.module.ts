import { Module, forwardRef } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { AccessTokenStrategy } from './strategy/jwt.strategy';
import { RefreshTokenStrategy } from './strategy/refresh.strategy';
import { SessionModule } from '../session/session.module';
import { AccessTokenGuard } from './guard/access-auth.guard';
import { EnvironmentVariables } from '@/validators/env.validation';
import { RolesGuard } from './guard/roles.guard';
import { TenantGuard } from './guard/tenant.guard';
import { VerificationTokenModule } from '../verification-token/verification-token.module';
import { IntentService } from './intent.service';
import { AuthorizationMethodGuard } from './guard/authorization-method.guard';
import { UserAuthorizationModule } from '../user/authorization/user-authorization.module';

@Module({
    imports: [
        SessionModule,
        VerificationTokenModule,
        forwardRef(() => UserAuthorizationModule),
        JwtModule.registerAsync({
            global: true,
            useFactory: (
                configService: ConfigService<EnvironmentVariables>,
            ) => ({
                secret: configService.get<string>('JWT_ACCESS_SECRET'),

                signOptions: {
                    expiresIn: configService.get<string>(
                        'JWT_ACCESS_TOKEN_EXPIRES_IN',
                    ) as unknown as number,
                },
            }),
            inject: [ConfigService],
        }),
    ],
    providers: [
        { provide: APP_GUARD, useClass: AccessTokenGuard },
        { provide: APP_GUARD, useClass: RolesGuard },
        { provide: APP_GUARD, useClass: TenantGuard },
        { provide: APP_GUARD, useClass: AuthorizationMethodGuard },

        ConfigService,
        AccessTokenStrategy,
        RefreshTokenStrategy,
        IntentService,
    ],
    exports: [
        ConfigService,
        AccessTokenStrategy,
        RefreshTokenStrategy,
        SessionModule,
        VerificationTokenModule,
        IntentService,
    ],
})
export class AuthModule {}
