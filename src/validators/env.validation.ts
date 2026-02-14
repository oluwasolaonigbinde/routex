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

    @IsOptional()
    PAYSTACK_SECRET_KEY: string;

    @IsOptional()
    PAYSTACK_CALLBACK_URL: string;

    @IsString()
    JWT_SECRET: string;

    @IsOptional()
    ENCRYPTION_KEY: string;
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
