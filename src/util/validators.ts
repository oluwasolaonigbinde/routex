import {
    registerDecorator,
    ValidationOptions,
    ValidatorConstraint,
    ValidatorConstraintInterface,
} from 'class-validator';

const DATE_FORMAT_REGEX = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

@ValidatorConstraint({ name: 'IsDateFormat', async: false })
class IsDateFormatConstraint implements ValidatorConstraintInterface {
    validate(value: unknown): boolean {
        if (typeof value !== 'string') return false;
        if (!DATE_FORMAT_REGEX.test(value)) return false;

        // Ensure the date itself is valid (e.g. rejects 2026-02-30)
        const date = new Date(value);
        return !isNaN(date.getTime());
    }

    defaultMessage(): string {
        return 'Date must be a valid date in YYYY-MM-DD format';
    }
}

/**
 * Validates that a string is a valid date in YYYY-MM-DD format.
 * @example
 * \@IsDateFormat()
 * \@IsDateFormat('Departure date must be YYYY-MM-DD')
 * \@IsDateFormat({ message: 'Departure date must be YYYY-MM-DD' })
 * scheduleDate: string;
 */
export function IsDateFormat(
    options?: ValidationOptions | string,
): PropertyDecorator {
    const normalizedOptions: ValidationOptions =
        typeof options === 'string' ? { message: options } : (options ?? {});

    return (object, propertyName) => {
        registerDecorator({
            target: object.constructor,
            propertyName: propertyName as string,
            options: normalizedOptions,
            constraints: [],
            validator: IsDateFormatConstraint,
        });
    };
}
