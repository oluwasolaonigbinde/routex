import { AccessTokenDTO } from '@/types/auth';
import { EnvironmentVariables } from '@/validators/env.validation';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy as JwtStrategy } from 'passport-jwt';

@Injectable()
export class AccessTokenStrategy extends PassportStrategy(JwtStrategy, 'jwt') {
    constructor(private configService: ConfigService<EnvironmentVariables>) {
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),

            ignoreExpiration: false,
            secretOrKey: configService.get<string>('JWT_ACCESS_SECRET') || '',
        });
    }

    validate(payload: AccessTokenDTO) {
        return payload;
    }
}
