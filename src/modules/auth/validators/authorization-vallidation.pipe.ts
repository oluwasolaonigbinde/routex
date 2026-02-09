import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';
import { AuthorizationMethod } from '@prisma/client';
import { plainToInstance, ClassConstructor } from 'class-transformer';
import { validateSync } from 'class-validator';
import {
    OtpAuthorizationDto,
    PasswordAuthorizationDto,
} from '../dto/authorization.dto';

type AuthorizationDto = PasswordAuthorizationDto | OtpAuthorizationDto;

@Injectable()
export class AuthorizationValidationPipe implements PipeTransform {
    private readonly dtoMap: Record<
        AuthorizationMethod,
        ClassConstructor<AuthorizationDto>
    > = {
        PASSWORD: PasswordAuthorizationDto,
        OTP: OtpAuthorizationDto,
        TOTP: OtpAuthorizationDto,
    };

    transform(value: unknown) {
        if (!value || typeof value !== 'object') {
            throw new BadRequestException('Invalid request body');
        }

        const body = value as Record<string, unknown>;
        const method = body.method;

        if (!method || typeof method !== 'string' || !(method in this.dtoMap)) {
            throw new BadRequestException('Unsupported authorization method');
        }

        const DtoClass = this.dtoMap[method as AuthorizationMethod];
        console.log('method', method, body);

        const dto = plainToInstance(DtoClass, value, {
            enableImplicitConversion: false,
        });

        const errors = validateSync(dto, {
            whitelist: true,
        });

        if (errors.length > 0) {
            throw new BadRequestException(errors);
        }

        return dto;
    }
}
