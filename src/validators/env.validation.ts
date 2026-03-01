import { plainToInstance, Type } from 'class-transformer';
import {
    IsEnum,
    IsIn,
    IsNotEmpty,
    IsNumber,
    IsOptional,
    IsString,
    Max,
    Min,
    validateSync,
} from 'class-validator';

enum Environment {
    Development = 'development',
    Production = 'production',
    Staging = 'staging',
    Test = 'test',
}

export class EnvironmentVariables {
    @IsEnum(Environment)
    NODE_ENV: Environment;

    @IsNumber()
    @Type(() => Number)
    @Min(0)
    @Max(65535)
    PORT: number;

    @IsNotEmpty()
    DATABASE_URL: string;

    @IsNotEmpty()
    JWT_ACCESS_SECRET: string;

    @IsNotEmpty()
    JWT_ACCESS_TOKEN_EXPIRES_IN: string;

    @IsNotEmpty()
    JWT_REFRESH_SECRET: string;

    @IsNotEmpty()
    JWT_REFRESH_TOKEN_EXPIRES_IN: string;

    @IsNotEmpty()
    MAIL_FROM: string;

    @IsNotEmpty()
    SMTP_URI: string;

    @IsNotEmpty()
    SMTP_USER: string;

    @IsNotEmpty()
    SMTP_PASSWORD: string;

    @IsOptional()
    @IsString()
    @IsIn(['resend', 'smtp'])
    EMAIL_PROVIDER?: 'resend' | 'smtp';

    @IsString()
    PAYSTACK_SECRET_KEY: string;

    @IsString()
    JWT_SECRET: string;

    @IsOptional()
    ENCRYPTION_KEY: string;

    @IsOptional()
    @IsNumber()
    @Type(() => Number)
    @Min(1)
    TRIP_START_WINDOW_BEFORE_MIN: number = 30;

    @IsOptional()
    @IsNumber()
    @Type(() => Number)
    @Min(1)
    TRIP_START_WINDOW_AFTER_MIN: number = 30;

    /** Maximum days in advance a booking can be made (default: 30). */
    @IsOptional()
    @IsNumber()
    @Type(() => Number)
    @Min(1)
    BOOKING_MAX_ADVANCE_DAYS: number = 30;

    /** Hours before departure after which cancellation is blocked (default: 3). */
    @IsOptional()
    @IsNumber()
    @Type(() => Number)
    @Min(0)
    CANCELLATION_CUTOFF_HOURS: number = 3;

    /** Percentage of totalPrice charged as cancellation penalty (default: 5). */
    @IsOptional()
    @IsNumber()
    @Type(() => Number)
    @Min(0)
    @Max(100)
    CANCELLATION_PENALTY_PERCENT: number = 5;

    /**
     * Maximum cancellation penalty.
     * Defaults to (≈ ₦2,000). Set to 0 to disable the cap.
     */
    @IsOptional()
    @IsNumber()
    @Type(() => Number)
    @Min(0)
    CANCELLATION_PENALTY_CAP: number = 2000;

    /**
     * Minutes after booking creation during which cancellation is free.
     * Defaults to 30. Set to 0 to disable the grace period.
     */
    @IsOptional()
    @IsNumber()
    @Type(() => Number)
    @Min(0)
    CANCELLATION_GRACE_PERIOD_MIN: number = 15;

    /** Minutes after which unpaid bookings are automatically expired (default: 15). */
    @IsOptional()
    @IsNumber()
    @Type(() => Number)
    @Min(1)
    BOOKING_PAYMENT_TIMEOUT_MIN: number = 15;
}

export function validate(config: Record<string, unknown>) {
    const validatedConfig = plainToInstance(EnvironmentVariables, config, {
        enableImplicitConversion: true,
    });
    const errors = validateSync(validatedConfig, {
        skipMissingProperties: false,
    });

    if (errors.length > 0) {
        throw new Error(errors.toString());
    }
    return validatedConfig;
}
