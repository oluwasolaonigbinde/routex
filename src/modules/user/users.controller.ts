import {
    Controller,
    Get,
    HttpCode,
    HttpStatus,
    Post,
    HttpException,
    Body,
    UseGuards,
    Patch,
    Req,
    Query,
    Delete,
    Param,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { SessionListResponse } from '../auth/entities/auth.entity';
import type { AccessTokenDTO, RefreshToken } from '@/types/auth';
import { Public } from '../auth/decorators/public-route.decorator';
import {
    ChangePasswordDto,
    ForgotPasswordDto,
    ResetPasswordDto,
    LoginDto,
    DeviceInfo,
    VerifyEmailDto,
} from '../auth/dto/auth.dto';
import { RefreshTokenGuard } from '../auth/guard/refresh-auth.guard';
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
    ApiConsumes,
} from '@nestjs/swagger';
import { UpdateProfileDto, CreateUserDto } from './dto/dto';
import {
    LoginUserResponse,
    UserPrivateEntityApiResponse,
} from './entities/user.entity';
import { ApiResponse as ApiResponseType } from '@/types';
import { FormDataRequest } from 'nestjs-form-data';
import { RequiredScopes } from '../auth/decorators/scopes.decorator';
import { SerializeOptions } from '@/util/decorator';
import type { Request } from 'express';
import { PaginatedQuery } from '@/util/dto';
import { SessionService } from '../session/session.service';
import { User } from '@prisma/client';
import { UserToken } from '@/decorators/user';

@ApiTags('Users')
@Controller('user')
@Tenant('USER')
export class UsersController {
    constructor(
        private readonly usersService: UsersService,
        private readonly sessionService: SessionService,
    ) {}

    @ApiBearerAuth()
    @ApiOperation({ summary: 'Get authenticated user profile' })
    @ApiResponse({
        status: 200,
        description: 'Profile retrieved successfully',
        type: UserPrivateEntityApiResponse,
    })
    @SerializeOptions({
        type: UserPrivateEntityApiResponse,
        strategy: 'excludeAll',
    })
    @HttpCode(HttpStatus.OK)
    @Get('profile')
    async getProfile(
        @UserToken<AccessTokenDTO>() token: AccessTokenDTO,
    ): Promise<ApiResponseType<User>> {
        const user = await this.usersService.findUser({ id: token.sub });

        return {
            data: user,
            status: 'success',
            message: 'Profile retrieved successfully',
        };
    }

    @ApiBearerAuth()
    @ApiOperation({ summary: 'Update authenticated user profile' })
    @ApiConsumes('multipart/form-data')
    @ApiBody({
        type: UpdateProfileDto,
    })
    @ApiResponse({
        status: 200,
        description: 'Profile updated successfully',
        type: UserPrivateEntityApiResponse,
    })
    @ApiUnauthorizedResponse({ description: 'Unauthorized' })
    @ApiBadRequestResponse({ description: 'Invalid input data' })
    @SerializeOptions({
        type: UserPrivateEntityApiResponse,
        strategy: 'excludeAll',
    })
    @FormDataRequest()
    @Patch('profile')
    @HttpCode(HttpStatus.OK)
    async updateProfile(
        @UserToken<AccessTokenDTO>() token: AccessTokenDTO,
        @Body() updateProfileDto: UpdateProfileDto,
    ): Promise<ApiResponseType<User>> {
        const updatedUser = await this.usersService.updateProfile(
            token.sub,
            updateProfileDto,
        );

        return {
            data: updatedUser,
            status: 'success',
            message: 'Profile updated successfully',
        };
    }

    @ApiOperation({ summary: 'User login' })
    @ApiBody({ type: LoginDto, description: 'User login credentials' })
    @ApiResponse({
        status: 200,
        description: 'Login successful',
        type: LoginUserResponse,
    })
    @SerializeOptions({
        type: LoginUserResponse,
        strategy: 'excludeAll',
    })
    @Public()
    @HttpCode(HttpStatus.OK)
    @Post('login')
    async login(@Body() loginDto: LoginDto, @Req() req: Request) {
        const deviceInfo: DeviceInfo = {
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'],
            deviceId: loginDto.deviceId,
            deviceName: loginDto.deviceName,
        };
        const loginData = await this.usersService.signIn(loginDto, deviceInfo);

        return {
            data: loginData,
            message: 'Login successful',
            status: 'success',
        };
    }

    @ApiOperation({ summary: 'User registration' })
    @ApiBody({
        type: CreateUserDto,
        description: 'User registration data',
    })
    @ApiResponse({
        status: 201,
        description: 'User registered successfully',
        type: LoginUserResponse,
    })
    @SerializeOptions({
        type: LoginUserResponse,
        strategy: 'excludeAll',
    })
    @Public()
    @HttpCode(HttpStatus.OK)
    @Post('signup')
    async signup(@Body() _createUserDto: CreateUserDto, @Req() req: Request) {
        const { deviceId, deviceName, ...createUserDto } = _createUserDto;
        const deviceInfo: DeviceInfo = {
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'],
            deviceId: deviceId,
            deviceName: deviceName,
        };
        const signupData = await this.usersService.signUp(
            createUserDto,
            deviceInfo,
        );

        return {
            data: signupData,
            message: 'User registered successfully',
            status: 'success',
        };
    }

    @Post('resend-verification')
    @RequiredScopes('email:resend')
    async resendVerificationEmail(
        @UserToken<AccessTokenDTO>() token: AccessTokenDTO,
    ) {
        await this.usersService.resendVerificationEmail(token.sub);

        return {
            status: 'success',
            message: 'Verification email resent successfully',
        };
    }

    @Post('verify-email')
    @Public()
    @ApiBody({ type: VerifyEmailDto })
    async verifyEmail(@Body() verifyEmailDto: VerifyEmailDto) {
        await this.usersService.verifyEmail(
            verifyEmailDto.token,
            verifyEmailDto.email,
        );

        return {
            status: 'success',
            message: 'Email verified successfully',
        };
    }

    @ApiOperation({ summary: 'Refresh access token' })
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
        return await this.usersService.refreshToken(token);
    }

    @ApiOperation({ summary: 'User logout' })
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
        if (await this.usersService.logout(token)) {
            return { status: 'success', message: 'Successfully logged out' };
        }
        throw new HttpException('Failed to log out', HttpStatus.NOT_FOUND);
    }

    @ApiOperation({ summary: 'Change user password' })
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
    @ApiBadRequestResponse({
        description: 'Invalid old password or weak new password',
    })
    @ApiNotFoundResponse({ description: 'Failed to change password' })
    @Post('change-password')
    @HttpCode(HttpStatus.OK)
    async changePassword(
        @UserToken<AccessTokenDTO>() token: AccessTokenDTO,
        @Body() password: ChangePasswordDto,
    ) {
        if (await this.usersService.changePassword(token.sub, password)) {
            return {
                status: 'success',
                message: 'Successfully changed password',
            };
        }
        throw new HttpException(
            'Failed to change password',
            HttpStatus.NOT_FOUND,
        );
    }

    @ApiOperation({ summary: 'Request password reset' })
    @ApiBody({
        type: ForgotPasswordDto,
        description: 'Email for password reset',
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
        try {
            await this.usersService.requestPasswordReset(
                forgotPasswordDto.email,
            );
        } catch {
            throw new HttpException(
                'Failed to process password reset request',
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }

        return { message: 'Password reset email sent' };
    }

    @ApiOperation({ summary: 'Reset password with token' })
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
            await this.usersService.resetPassword(resetPasswordDto);
        if (resetPasswordStatus) {
            return {
                status: 'success',
                message: 'Successfully changed password',
            };
        }
        throw new HttpException(
            'Failed to reset password',
            HttpStatus.NOT_FOUND,
        );
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
