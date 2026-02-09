import { applyDecorators } from '@nestjs/common';
import { IsNotEmpty, IsString, IsStrongPassword } from 'class-validator';

export function IsPassword() {
    return applyDecorators(
        IsNotEmpty({ message: 'Password is required' }),
        IsString(),
        IsStrongPassword(
            {
                minLength: 6,
                minLowercase: 1,
                minUppercase: 1,
                minNumbers: 1,
            },
            {
                message:
                    'Password must be at least 6 characters long and include uppercase letters, lowercase letters and number.',
            },
        ),
    );
}
