import {
    applyDecorators,
    ClassSerializerContextOptions,
    SerializeOptions as _SerializeOptions,
    SetMetadata,
} from '@nestjs/common';
import { Expose } from 'class-transformer';

type ClassConstructor<T extends object = object> = new (
    ...args: unknown[]
) => T | void;

export function ExposeAll() {
    return (constructor: ClassConstructor) => {
        let proto: object = constructor.prototype as unknown as object;

        // Instantiate the class to get instance properties
        let instance: object | undefined | void;
        try {
            instance = new constructor();
        } catch {
            instance = undefined;
        }

        while (proto && proto !== Object.prototype && instance) {
            // Get all instance properties if instantiation succeeded
            const instanceProps = instance
                ? Object.getOwnPropertyNames(instance)
                : [];

            // Apply Expose() to all properties
            for (const key of instanceProps) {
                if (key === 'constructor') continue;
                Expose()(proto, key);
            }

            // Handle metadata keys
            const metadataKeys = Reflect.getMetadataKeys(instance) || [];

            for (const metaKey of metadataKeys) {
                // Metadata might be per-property, so grab property names
                const metaProps: string[] =
                    (Reflect.getMetadata(
                        metaKey,
                        proto,
                    ) as unknown as string[]) || [];
                if (Array.isArray(metaProps)) {
                    for (const key of metaProps) {
                        if (key === 'constructor') continue;
                        Expose()(proto, key.slice(1));
                    }
                }
            }

            proto = Object.getPrototypeOf(instance) as unknown as object;
            if (proto && instance) {
                // Move up the prototype chain
                instance = Object.getPrototypeOf(instance) as unknown as object;
            }
        }
    };
}

export const RESPONSE_DTO_KEY = 'response:dto';

export const SetResponseType = (type: unknown) =>
    SetMetadata(RESPONSE_DTO_KEY, type);

export function SerializeOptions(options: ClassSerializerContextOptions) {
    const decorators = [_SerializeOptions(options)];

    decorators.unshift(SetResponseType(options));

    return applyDecorators(...decorators);
}
