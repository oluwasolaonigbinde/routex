import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { TokenType } from '@prisma/client';
import { createHash, randomBytes, randomInt } from 'crypto';

const SINGLE_USE_TOKEN_TYPES: TokenType[] = [
    'PASSWORD_RESET',
    'EMAIL_VERIFICATION',
];

@Injectable()
export class VerificationTokenService {
    constructor(private readonly database: DatabaseService) {}

    private readonly TOKEN_EXPIRATIONS: Record<TokenType, number> = {
        EMAIL_VERIFICATION: 10 * 60 * 1000, // 10 minutes
        PASSWORD_RESET: 10 * 60 * 1000, // 10 minutes
    };

    generateToken(type: 'otp' | 'long' = 'otp'): string {
        if (type === 'otp') {
            const otp = randomInt(0, 10 ** 6);
            return otp.toString().padStart(6, '0');
        }
        return randomBytes(32).toString('hex');
    }

    hashToken(token: string): string {
        return createHash('sha512').update(token).digest('hex');
    }

    async createToken({
        tokenType = 'long',
        email,
        userId,
        customExpirationMs,
        type,
    }: {
        type: TokenType;
        email?: string;
        userId?: string;
        customExpirationMs?: number;
        tokenType?: 'otp' | 'long';
    }) {
        if (!email && !userId) {
            throw new Error('Either email or id must be provided');
        }

        const canReuseToken = !SINGLE_USE_TOKEN_TYPES.includes(type);
        // enforce single token for PASSWORD_RESET
        if (!canReuseToken) {
            await this.database.verificationToken.deleteMany({
                where: {
                    email,
                    userId,
                    type: type,
                },
            });
        }

        const token = this.generateToken(tokenType);
        const tokenHash = this.hashToken(token);

        const expiresAt = new Date(
            Date.now() + (customExpirationMs || this.TOKEN_EXPIRATIONS[type]),
        );

        const tokenRecord = await this.database.verificationToken.create({
            data: {
                email,
                userId,
                token: tokenHash,
                type,
                expiresAt,
            },
        });

        return {
            rawToken: token,
            token: tokenRecord,
            expiresAt,
        };
    }

    async validateToken(
        type: TokenType,
        rawToken: string,
        email?: string | null,
        userId?: string | null,
        errorMsg?: string,
    ) {
        const tokenHash = this.hashToken(rawToken);
        const token = await this.database.verificationToken.findFirst({
            where: {
                token: tokenHash,
                email: email,
                userId: userId,
                type: type,
                expiresAt: {
                    gt: new Date(),
                },
            },
        });

        if (!token) {
            throw new NotFoundException(errorMsg || 'Invalid or expired token');
        }

        return token;
    }

    async deleteToken(id: string) {
        await this.database.verificationToken.delete({
            where: { id },
        });
        return true;
    }
}
