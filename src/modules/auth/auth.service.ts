import {
    BadRequestException,
    ForbiddenException,
    HttpException,
    HttpStatus,
    Injectable,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { v4 as uuidv4 } from 'uuid';
import { SessionService } from '../session/session.service';
import { DatabaseService } from '../database/database.service';
import * as speakeasy from 'speakeasy';
import {
    BaseUserAccessTokenClaims,
    RefreshToken,
    Tokens,
    UserTokenResponse,
} from '@/types/auth';
import { AccessTokenDTO, RefreshTokenDto } from '@/types/auth';
import { EnvironmentVariables } from '../../validators/env.validation';
import {
    ChangePasswordDto,
    ResetPasswordDto,
    LoginDto,
    DeviceInfo,
} from './dto/auth.dto';
import {
    ActionRequiredException,
    PasswordRequiredException,
    UserAlreadyExists,
    UserWithEmailNotFoundException,
    UserWithIdNotFoundException,
} from '@/common/exception/exception';
import { VerificationTokenService } from '../verification-token/verification-token.service';
import { BaseUserEntity, CreateBaseUserDto } from './entities/auth.entity';
import { compareHash, decrypt, encrypt, hashData } from '@/util/util';
import * as crypto from 'crypto';

@Injectable()
export abstract class AbstractAuthService {
    constructor(
        protected jwtService: JwtService,
        protected configService: ConfigService<EnvironmentVariables>,
        protected sessionService: SessionService,
        protected databaseService: DatabaseService,
        protected verificationService: VerificationTokenService,
    ) {}

    abstract get tenantId(): string;

    abstract findUserWithoutException({
        username,
        email,
        id,
    }: {
        username?: string;
        email?: string;
        id?: string;
    }): Promise<BaseUserEntity | null>;

    abstract findUser({
        username,
        email,
        id,
    }: {
        username?: string;
        email?: string;
        id?: string;
    }): Promise<BaseUserEntity>;

    abstract create(user: CreateBaseUserDto): Promise<BaseUserEntity>;

    abstract updateUser(
        userId: string,
        newData: Partial<BaseUserEntity>,
    ): Promise<BaseUserEntity>;

    abstract requestPasswordReset(email: string): Promise<void>;

    async signIn(userDto: LoginDto, deviceInfo: DeviceInfo) {
        const user = await this.findUser({
            email: userDto.email,
        });

        if (!user.password) {
            throw new PasswordRequiredException();
        }

        const passwordMatch = await compareHash(
            userDto.password,
            user.password,
        );

        if (!passwordMatch) {
            throw new ForbiddenException('Incorrect password');
        }

        if (user.credentialStatus === 'SUSPENDED') {
            throw new ForbiddenException('User account is suspended');
        }

        if (user.credentialStatus === 'LOCKED') {
            throw new ForbiddenException('User account is locked');
        }

        if (user.credentialStatus === 'BLOCKED') {
            throw new ForbiddenException('User account is blocked');
        }

        if (user.passwordResetRequired) {
            const resetToken = await this.generateAccessToken(user, null, [
                'password:reset',
            ]);
            throw new ActionRequiredException({
                reason: 'PASSWORD_RESET_REQUIRED',
                message: 'You must change your password before continuing.',
                next: {
                    action: 'RESET_PASSWORD',
                    token: resetToken,
                },
            });
        }

        if (user.requireEmailVerification && !user.emailVerifiedAt) {
            const resendVerificationToken = await this.generateAccessToken(
                user,
                null,
                ['email:resend'],
            );

            throw new ActionRequiredException({
                reason: 'EMAIL_VERIFICATION_REQUIRED',
                message: 'You must verify your email before continuing.',
                next: {
                    action: 'RESEND_VERIFICATION_EMAIL',
                    token: resendVerificationToken,
                    meta: {
                        email: user.email,
                    },
                },
            });
        }

        if (user.require2Fa && !user.twoFactorEnabled) {
            if (user.twoFactorSecret) {
                const twoFAToken = await this.generateAccessToken(user, null, [
                    '2fa:verify',
                ]);
                throw new ActionRequiredException({
                    reason: 'TWO_FACTOR_AUTHENTICATION_REQUIRED',
                    message: 'Two-factor authentication is required.',
                    next: {
                        action: 'VERIFY_2FA',
                        token: twoFAToken,
                    },
                });
            }

            const twoFASetupToken = await this.generateAccessToken(user, null, [
                '2fa:setup',
            ]);

            throw new ActionRequiredException({
                reason: 'TWO_FACTOR_SETUP_REQUIRED',
                message: 'Two-factor setup is required for this account.',
                next: {
                    action: 'SETUP_2FA',
                    token: twoFASetupToken,
                },
            });
        }

        if (user.twoFactorEnabled) {
            const twoFAToken = await this.generateAccessToken(user, null, [
                '2fa:verify',
            ]);
            throw new ActionRequiredException({
                reason: 'TWO_FACTOR_AUTHENTICATION_REQUIRED',
                message: 'Two-factor authentication is required.',
                next: {
                    action: 'VERIFY_2FA',
                    token: twoFAToken,
                },
            });
        }

        return {
            ...(await this.createUserSession(user, deviceInfo)),
            user: user,
        };
    }

    async signUp(
        user: CreateBaseUserDto,
        deviceInfo?: DeviceInfo | null,
        createSession: boolean = true,
    ): Promise<UserTokenResponse> {
        const userExists: BaseUserEntity | null =
            await this.findUserWithoutException({
                email: user.email,
            });

        if (userExists) {
            throw new UserAlreadyExists();
        }

        const hashPassword = await hashData(user.password);
        const newUser = await this.create({
            ...user,
            password: hashPassword,
        });

        if (!createSession) {
            return {
                user: newUser,
            };
        }

        if (!deviceInfo) {
            throw new BadRequestException(
                'Device information is required to create a session.',
            );
        }

        return {
            ...(await this.createUserSession(newUser, deviceInfo)),
            user: newUser,
        };
    }

    async createUserSession(
        user: BaseUserEntity,
        deviceInfo: DeviceInfo,
    ): Promise<Tokens> {
        const refreshToken = await this.generateRefreshToken(user);
        const hashedRefreshToken = await hashData(refreshToken);

        const decodedRefreshToken =
            this.jwtService.decode<RefreshTokenDto>(refreshToken);

        await this.sessionService.createSession({
            tokenHash: hashedRefreshToken,
            expiresAt: new Date(decodedRefreshToken.exp * 1000),
            userId: user.id,
            id: decodedRefreshToken.jti,
            ...deviceInfo,
        });

        const accessToken = await this.generateAccessToken(
            user,
            decodedRefreshToken.jti,
        );

        return { access_token: accessToken, refresh_token: refreshToken };
    }

    abstract getClaims(user: BaseUserEntity): BaseUserAccessTokenClaims;

    async generateAccessToken(
        user: BaseUserEntity,
        sid?: string | null,
        scope?: string[],
    ) {
        return this.jwtService.signAsync(
            {
                sub: user.id,
                scope: scope,
                ...(sid ? { sid: sid } : {}),
                ...this.getClaims(user),
            },
            {
                secret:
                    this.configService.get<string>('JWT_ACCESS_SECRET') || '',
                expiresIn: this.configService.get<string>(
                    'JWT_ACCESS_TOKEN_EXPIRES_IN',
                ) as unknown as number,
            },
        );
    }

    async generateRefreshToken(user: BaseUserEntity) {
        const tokenId = uuidv4();
        return this.jwtService.signAsync(
            {
                sub: user.id,
                jti: tokenId,
            },
            {
                secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
                expiresIn: this.configService.get<string>(
                    'JWT_REFRESH_TOKEN_EXPIRES_IN',
                ) as unknown as number,
            },
        );
    }

    async refreshToken(refreshToken: RefreshToken) {
        const user = await this.findUser({ id: refreshToken.sub });

        const { id: sessionId } = await this.sessionService.verifySession(
            refreshToken.sub,
            refreshToken.jti,
            refreshToken.token,
        );

        return {
            access_token: await this.generateAccessToken(user, sessionId),
        };
    }

    async logout(userToken: AccessTokenDTO) {
        if (!userToken.sid) {
            throw new BadRequestException('No session ID found');
        }
        return await this.sessionService.deleteSession(userToken.sid);
    }

    async changePassword(userId: string, password: ChangePasswordDto) {
        const user = await this.findUser({
            id: userId,
        });

        const passwordMatch = await compareHash(
            password.oldPassword,
            user.password,
        );

        if (!passwordMatch) {
            throw new HttpException('Incorrect password', HttpStatus.FORBIDDEN);
        }

        const newPasswordSameAsOld = await compareHash(
            password.newPassword,
            user.password,
        );

        if (newPasswordSameAsOld) {
            throw new BadRequestException(
                'New password must be different from old password',
            );
        }

        const hashNewPassword = await hashData(password.newPassword);

        await this.updateUser(userId, {
            password: hashNewPassword,
            passwordResetRequired: false,
        });

        await this.sessionService.invalidateUserSessions(userId);

        return true;
    }

    async resetPassword(resetPasswordDto: ResetPasswordDto) {
        const user = await this.findUser({
            email: resetPasswordDto.email,
        });

        if (!user) {
            throw new UserWithEmailNotFoundException(resetPasswordDto.email);
        }

        const token = await this.verificationService.validateToken(
            'PASSWORD_RESET',
            resetPasswordDto.token,
            resetPasswordDto.email,
            user?.id,
        );

        const newPassword = await hashData(resetPasswordDto.newPassword);

        await this.updateUser(user.id, {
            password: newPassword,
        });

        await this.verificationService.deleteToken(token.id);
        await this.sessionService.invalidateUserSessions(user.id);
        return true;
    }

    async resendVerificationEmail(userId: string) {
        const user = await this.findUser({ id: userId });
        if (!user) {
            throw new UserWithIdNotFoundException(userId);
        }

        if (user.emailVerifiedAt) {
            throw new BadRequestException('Email is already verified');
        }

        const token = await this.verificationService.createToken({
            type: 'EMAIL_VERIFICATION',
            email: user.email,
            userId: user.id,
            tokenType: 'otp',
        });
        return { expiresAt: token.expiresAt, token: token.rawToken };
    }

    async verifyEmail(token: string, email: string) {
        const user = await this.findUser({ email });

        if (!user) {
            throw new UserWithEmailNotFoundException(email);
        }

        if (user.emailVerifiedAt) {
            throw new BadRequestException('Email is already verified');
        }

        const verificationToken = await this.verificationService.validateToken(
            'EMAIL_VERIFICATION',
            token,
            email,
            user?.id,
        );

        await this.updateUser(user.id, {
            emailVerifiedAt: new Date(),
        });

        await this.verificationService.deleteToken(verificationToken.id);
        return true;
    }

    abstract deleteBackupCodes(userId: string): Promise<void>;

    abstract createBackupCodes(
        userId: string,
        backupCodes: string[],
    ): Promise<void>;

    abstract findBackupCodeById(
        userId: string,
        code: string,
    ): Promise<{ id: string }>;

    abstract useBackupCode(id: string): Promise<void>;

    async generateBackupCodes(userId: string) {
        await this.deleteBackupCodes(userId);

        // Generate new codes
        const codes: string[] = [];
        const plainTextCodes: string[] = [];

        for (let i = 0; i < 7; i++) {
            const plainText = crypto.randomBytes(5).toString('hex');
            plainTextCodes.push(plainText);
            const code = crypto
                .createHash('sha256')
                .update(plainText)
                .digest('hex');
            codes.push(code);
        }

        await this.createBackupCodes(userId, codes);

        await this.sessionService.invalidateUserSessions(userId);

        return plainTextCodes;
    }

    async verifyBackupCode(
        userId: string,
        code: string,
        deviceInfo: DeviceInfo,
    ) {
        const user = await this.findUser({ id: userId });
        const hashedCode = crypto
            .createHash('sha256')
            .update(code)
            .digest('hex');

        const backupCode = await this.findBackupCodeById(userId, hashedCode);

        await this.useBackupCode(backupCode.id);

        return {
            ...(await this.createUserSession(user, deviceInfo)),
            user: user,
        };
    }

    async setup2Fa(userId: string) {
        const user = await this.findUser({ id: userId });

        const secret = speakeasy.generateSecret({
            issuer: 'Routex',
            name: `Routex: ${user.email}`,
        });

        await this.updateUser(userId, {
            twoFactorSecret: encrypt(
                secret.base32,
                this.configService.get<string>('ENCRYPTION_KEY') || '',
            ),
            twoFactorMethod: 'totp',
        });

        const backupCodes = await this.generateBackupCodes(userId);

        return { otpauth_url: secret.otpauth_url, backupCodes: backupCodes };
    }

    async verify2Fa(userId: string, token: string, deviceInfo: DeviceInfo) {
        const user = await this.findUser({ id: userId });

        if (!user.twoFactorSecret) {
            throw new BadRequestException('2FA is not set up for this user');
        }

        const decryptedSecret = decrypt(
            user.twoFactorSecret,
            this.configService.get<string>('ENCRYPTION_KEY') || '',
        );

        const isTokenValid = speakeasy.totp.verify({
            secret: decryptedSecret,
            encoding: 'base32',
            token: token,
            window: 1,
        });

        if (!isTokenValid) {
            throw new BadRequestException('Invalid 2FA token');
        }

        if (!user.twoFactorEnabled) {
            await this.updateUser(userId, {
                twoFactorEnabled: true,
            });
        }

        return {
            ...(await this.createUserSession(user, deviceInfo)),
            user: user,
        };
    }

    async disable2Fa(userId: string) {
        const user = await this.findUser({ id: userId });

        if (user.require2Fa) {
            throw new ForbiddenException(
                'Two-factor authentication is required for this account and cannot be disabled.',
            );
        }

        if (!user.twoFactorEnabled) {
            throw new BadRequestException('2FA is not enabled for this user');
        }

        await this.updateUser(userId, {
            twoFactorSecret: null,
            twoFactorMethod: null,
            twoFactorEnabled: false,
        });

        return true;
    }
}
