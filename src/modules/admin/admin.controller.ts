import {
    Controller,
    Get,
    Post,
    Body,
    HttpCode,
    HttpStatus,
    UseGuards,
    HttpException,
    Query,
    Param,
    Req,
    Delete,
} from '@nestjs/common';
import type { AccessTokenDTO, RefreshToken } from '@/types/auth';
import {
    ChangePasswordDto,
    DeviceInfo,
    ForgotPasswordDto,
    LoginDto,
    ResetPasswordDto,
    Verify2faDto,
    VerifyBackupCodeDto,
    VerifyEmailDto,
} from '../auth/dto/auth.dto';

import { Public } from '../auth/decorators/public-route.decorator';
import { RolesGuard } from '../auth/guard/roles.guard';
import { RolesRequired } from '../auth/decorators/roles.decorator';
import { AdminService } from './admin.service';
import { Tenant } from '../auth/decorators/tenant.decorator';
import {
    ApiBearerAuth,
    ApiOperation,
    ApiResponse,
    ApiTags,
    ApiBody,
    ApiUnauthorizedResponse,
    ApiBadRequestResponse,
    ApiNotFoundResponse,
    ApiForbiddenResponse,
} from '@nestjs/swagger';
import { RequiredScopes } from '../auth/decorators/scopes.decorator';
import {
    AdminEntityApiResponse,
    LoginAdminResponse,
} from './entities/admin.entity';
import {
    BackupCodesResponse,
    SessionListResponse,
} from '../auth/entities/auth.entity';
import { SerializeOptions } from '@/util/decorator';
import type { Request } from 'express';
import { RefreshTokenGuard } from '../auth/guard/refresh-auth.guard';
import { SessionService } from '../session/session.service';
import { PaginatedQuery } from '@/util/dto';
import { UserToken } from '@/decorators/user';
import { UserWithIdNotFoundException } from '@/common/exception/exception';
import { CreateAdminDto } from './dto/dto';

@ApiTags('Admin - Auth')
@Controller('admin')
@Tenant('ADMIN')
@RolesRequired('ADMIN')
export class AdminController {
    constructor(
        private readonly adminService: AdminService,
        private readonly sessionService: SessionService,
    ) {}

    @ApiOperation({ summary: 'Get authenticated admin profile' })
    @ApiBearerAuth()
    @ApiResponse({
        status: 200,
        description: 'Admin profile retrieved successfully',
        type: AdminEntityApiResponse,
    })
    @ApiUnauthorizedResponse({ description: 'Invalid access token' })
    @ApiForbiddenResponse({ description: 'Insufficient permissions' })
    @SerializeOptions({
        strategy: 'excludeAll',
        type: AdminEntityApiResponse,
    })
    @HttpCode(HttpStatus.OK)
    @Get('profile')
    async getProfile(
        @UserToken<AccessTokenDTO>() token: AccessTokenDTO,
    ): Promise<AdminEntityApiResponse> {
        const user = await this.adminService.findUser({ id: token.sub });

        if (!user) {
            throw new UserWithIdNotFoundException(token.sub);
        }

        return {
            data: user,
            status: 'success',
            message: 'Profile retrieved successfully',
        };
    }

    @ApiOperation({ summary: 'Admin login' })
    @ApiBody({ type: LoginDto, description: 'Admin login credentials' })
    @ApiResponse({
        status: 200,
        description: 'Login successful',
        type: LoginAdminResponse,
    })
    @ApiBadRequestResponse({ description: 'Invalid credentials' })
    @SerializeOptions({
        strategy: 'excludeAll',
        type: LoginAdminResponse,
    })
    @Public()
    @HttpCode(HttpStatus.OK)
    @Post('login')
    async login(
        @Body() loginDto: LoginDto,
        @Req() req: Request,
    ): Promise<LoginAdminResponse> {
        const deviceInfo: DeviceInfo = {
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'],
            deviceId: loginDto.deviceId,
            deviceName: loginDto.deviceName,
        };
        const response = await this.adminService.signIn(loginDto, deviceInfo);

        return {
            status: 'success',
            message: 'Login successful',
            data: response,
        };
    }

    @ApiOperation({ summary: 'Create new admin (SUPERADMIN only)' })
    @ApiBearerAuth()
    @ApiBody({
        type: CreateAdminDto,
        description: 'New admin registration data',
    })
    @ApiResponse({
        status: 200,
        description: 'Admin created successfully',
        type: AdminEntityApiResponse,
    })
    @ApiUnauthorizedResponse({ description: 'Invalid access token' })
    @ApiForbiddenResponse({ description: 'SUPERADMIN role required' })
    @ApiBadRequestResponse({
        description: 'Validation failed or admin already exists',
    })
    @RolesRequired('SUPERADMIN')
    @SerializeOptions({
        strategy: 'excludeAll',
        type: AdminEntityApiResponse,
    })
    @HttpCode(HttpStatus.OK)
    @Post('invite')
    async signup(
        @Body() createAdminDto: CreateAdminDto,
    ): Promise<AdminEntityApiResponse> {
        const signupData = await this.adminService.signUp(
            createAdminDto,
            null,
            false,
        );

        return {
            status: 'success',
            message: 'Admin created successfully',
            data: signupData.user,
        };
    }

    @Post('resend-verification')
    @RequiredScopes('email:resend')
    async resendVerificationEmail(
        @UserToken<AccessTokenDTO>() token: AccessTokenDTO,
    ) {
        await this.adminService.resendVerificationEmail(token.sub);

        return {
            status: 'success',
            message: 'Verification email resent successfully',
        };
    }

    @Public()
    @ApiBody({ type: VerifyEmailDto })
    @Post('verify-email')
    async verifyEmail(@Query() verifyEmailQuery: VerifyEmailDto) {
        await this.adminService.verifyEmail(
            verifyEmailQuery.token,
            verifyEmailQuery.email,
        );
        return {
            status: 'success',
            message: 'Email verified successfully',
        };
    }

    @ApiOperation({ summary: 'Refresh admin access token' })
    @ApiBearerAuth()
    @ApiResponse({
        status: 200,
        description: 'Token refreshed successfully',
        schema: {
            example: {
                access_token: 'new_jwt_token',
            },
        },
    })
    @ApiUnauthorizedResponse({ description: 'Invalid refresh token' })
    @Public()
    @UseGuards(RefreshTokenGuard)
    @HttpCode(HttpStatus.OK)
    @Post('refresh')
    async refresh(@UserToken<RefreshToken>() token: RefreshToken) {
        return await this.adminService.refreshToken(token);
    }

    @ApiOperation({ summary: 'Admin logout' })
    @ApiBearerAuth()
    @ApiResponse({
        status: 200,
        description: 'Logout successful',
        schema: {
            example: {
                status: 'success',
                message: 'Successfully logged out',
            },
        },
    })
    @ApiUnauthorizedResponse({ description: 'Invalid access token' })
    @ApiNotFoundResponse({ description: 'Failed to log out' })
    @HttpCode(HttpStatus.OK)
    @Post('logout')
    async logout(@UserToken<AccessTokenDTO>() token: AccessTokenDTO) {
        if (await this.adminService.logout(token)) {
            return { status: 'success', message: 'Successfully logged out' };
        }
        throw new HttpException('Failed to log out', HttpStatus.NOT_FOUND);
    }

    @ApiOperation({ summary: 'Change admin password' })
    @ApiBearerAuth()
    @ApiBody({ type: ChangePasswordDto, description: 'Old and new password' })
    @ApiResponse({
        status: 200,
        description: 'Password changed successfully',
        schema: {
            example: {
                status: 'success',
                message: 'Successfully changed password',
            },
        },
    })
    @ApiUnauthorizedResponse({ description: 'Invalid access token' })
    @ApiForbiddenResponse({ description: 'Insufficient permissions' })
    @ApiBadRequestResponse({
        description: 'Invalid old password or weak new password',
    })
    @ApiNotFoundResponse({ description: 'Failed to change password' })
    @Post('change-password')
    @UseGuards(RolesGuard)
    @RequiredScopes('password:reset')
    @HttpCode(HttpStatus.OK)
    async changePassword(
        @UserToken<AccessTokenDTO>() token: AccessTokenDTO,
        @Body() password: ChangePasswordDto,
    ) {
        // this.authService.
        if (await this.adminService.changePassword(token.sub, password)) {
            return {
                status: 'success',
                message: 'Successfully changed password',
            };
        }
        throw new HttpException(
            'Failed to changed password',
            HttpStatus.NOT_FOUND,
        );
    }

    @ApiOperation({ summary: 'Request admin password reset' })
    @ApiBody({
        type: ForgotPasswordDto,
        description: 'Admin email for password reset',
    })
    @ApiResponse({
        status: 200,
        description: 'Password reset email sent',
        schema: {
            example: {
                message: 'Password reset email sent',
            },
        },
    })
    @ApiBadRequestResponse({ description: 'Invalid email format' })
    @Public()
    @Post('forgot-password')
    @HttpCode(HttpStatus.OK)
    async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
        await this.adminService.requestPasswordReset(forgotPasswordDto.email);

        return { message: 'Password reset email sent' };
    }

    @ApiOperation({ summary: 'Reset admin password with token' })
    @ApiBody({
        type: ResetPasswordDto,
        description: 'Reset token and new password',
    })
    @ApiResponse({
        status: 200,
        description: 'Password reset successful',
        schema: {
            example: {
                status: 'success',
                message: 'Successfully changed password',
            },
        },
    })
    @ApiBadRequestResponse({ description: 'Invalid token or weak password' })
    @ApiNotFoundResponse({ description: 'Failed to reset password' })
    @Public()
    @Post('reset-password')
    @HttpCode(HttpStatus.OK)
    async resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
        const resetPasswordStatus =
            await this.adminService.resetPassword(resetPasswordDto);
        if (resetPasswordStatus) {
            return {
                status: 'sucess',
                message: 'Successfully changed password',
            };
        }
        throw new HttpException(
            'Failed to reset password',
            HttpStatus.NOT_FOUND,
        );
    }

    @ApiOperation({ summary: 'Setup 2FA for user' })
    @ApiBearerAuth()
    @ApiResponse({
        status: 200,
        description: '2FA setup successful',
        schema: {
            example: {
                status: 'success',
                message: '2FA secret generated successfully',
                data: {
                    otpauthUrl: 'otpauth://totp/...',
                    backupCodes: ['code1', 'code2', 'code3', 'code4', 'code5'],
                },
            },
        },
    })
    @RequiredScopes('2fa:setup')
    @Post('2fa/setup')
    async setup2Fa(@UserToken<AccessTokenDTO>() token: AccessTokenDTO) {
        const data = await this.adminService.setup2Fa(token.sub);

        return {
            status: 'success',
            message: '2FA secret generated successfully',
            data: data,
        };
    }

    @ApiOperation({ summary: 'Verify 2FA token' })
    @ApiBearerAuth()
    @ApiResponse({
        status: 200,
        description: '2FA token verified successfully',
        type: LoginAdminResponse,
    })
    @SerializeOptions({
        strategy: 'excludeAll',
        type: LoginAdminResponse,
    })
    @RequiredScopes('2fa:verify')
    @Post('2fa/verify')
    async verify2Fa(
        @UserToken<AccessTokenDTO>() token: AccessTokenDTO,
        @Body() verify2FaDto: Verify2faDto,
        @Req() req: Request,
    ) {
        const deviceInfo: DeviceInfo = {
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'],
            deviceId: verify2FaDto.deviceId,
            deviceName: verify2FaDto.deviceName,
        };
        const response = await this.adminService.verify2Fa(
            token.sub,
            verify2FaDto.token,
            deviceInfo,
        );

        return {
            status: 'success',
            message: '2FA token verified successfully',
            data: response,
        };
    }

    @ApiOperation({ summary: 'Disable 2FA for user' })
    @ApiBearerAuth()
    @ApiResponse({
        status: 200,
        description: '2FA disabled successfully',
        schema: {
            example: {
                status: 'success',
                message: '2FA disabled successfully',
            },
        },
    })
    @Post('2fa/disable')
    async disable2Fa(@UserToken<AccessTokenDTO>() token: AccessTokenDTO) {
        await this.adminService.disable2Fa(token.sub);

        return {
            status: 'success',
            message: '2FA disabled successfully',
        };
    }

    @ApiOperation({ summary: "Verify user's backup code" })
    @ApiBearerAuth()
    @ApiResponse({
        status: 200,
        description: 'Backup code verified successfully',
        type: LoginAdminResponse,
    })
    @SerializeOptions({
        strategy: 'excludeAll',
        type: LoginAdminResponse,
    })
    @RequiredScopes('2fa:verify')
    @Post('2fa/verify-backup-code')
    async verifyBackupCode(
        @UserToken<AccessTokenDTO>() token: AccessTokenDTO,
        @Body() verifyBackupCodeDto: VerifyBackupCodeDto,
        @Req() req: Request,
    ) {
        const deviceInfo: DeviceInfo = {
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'],
            deviceId: verifyBackupCodeDto.deviceId,
            deviceName: verifyBackupCodeDto.deviceName,
        };
        const response = await this.adminService.verifyBackupCode(
            token.sub,
            verifyBackupCodeDto.code,
            deviceInfo,
        );

        return {
            status: 'success',
            message: 'Backup code verified successfully',
            data: response,
        };
    }

    @ApiOperation({ summary: "Regenerate user's backup codes" })
    @ApiBearerAuth()
    @ApiResponse({
        status: 200,
        description: 'Backup codes generated successfully',
        type: BackupCodesResponse,
    })
    @SerializeOptions({
        type: BackupCodesResponse,
        strategy: 'excludeAll',
    })
    @Post('2fa/regenerate-backup-codes')
    async generateBackupCodes(
        @UserToken<AccessTokenDTO>() token: AccessTokenDTO,
    ): Promise<BackupCodesResponse> {
        const backupCodes = await this.adminService.generateBackupCodes(
            token.sub,
        );

        return {
            status: 'success',
            message: 'Backup codes generated successfully',
            data: {
                codes: backupCodes,
            },
        };
    }

    @ApiOperation({ summary: 'Get user sessions' })
    @ApiBearerAuth()
    @ApiResponse({
        status: 200,
        description: 'User sessions retrieved successfully',
        type: SessionListResponse,
    })
    @SerializeOptions({
        type: SessionListResponse,
        strategy: 'excludeAll',
    })
    @Get('sessions')
    async getUserSessions(
        @UserToken<AccessTokenDTO>() token: AccessTokenDTO,
        @Query() query: PaginatedQuery,
    ) {
        const sessions = await this.sessionService.getUserSessions(
            token.sub,
            query,
            token.sid,
        );

        return {
            status: 'success',
            message: 'User sessions retrieved successfully',
            data: sessions,
        };
    }

    @ApiOperation({ summary: 'Revoke sessions by device ID' })
    @ApiBearerAuth()
    @ApiResponse({
        status: 200,
        description: 'Device sessions revoked successfully',
        schema: {
            example: {
                status: 'success',
                message: 'Device sessions revoked successfully',
            },
        },
    })
    @Delete('sessions/device/:deviceId')
    async revokeDeviceSessions(
        @UserToken<AccessTokenDTO>() token: AccessTokenDTO,
        @Param('deviceId') deviceId: string,
    ) {
        await this.sessionService.revokeDeviceSessions(token.sub, deviceId);

        return {
            status: 'success',
            message: 'Device sessions revoked successfully',
        };
    }
}
