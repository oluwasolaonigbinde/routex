import { RefreshToken, RefreshTokenDto } from '@/types/auth';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Request } from 'express';
import { ExtractJwt, Strategy as JwtStrategy } from 'passport-jwt';

@Injectable()
export class RefreshTokenStrategy extends PassportStrategy(
    JwtStrategy,
    'jwt-refresh',
) {
    constructor(private configService: ConfigService) {
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: configService.get<string>('JWT_REFRESH_SECRET') || '',
            passReqToCallback: true,
        });
    }

    validate(req: Request, payload: RefreshTokenDto): RefreshToken {
        const refreshToken = req
            .get('Authorization')
            ?.replace('Bearer', '')
            .trim();
        if (!refreshToken) {
            throw new Error('No refresh token found');
        }

        return {
            ...payload,
            token: refreshToken,
        };
    }
}
