import { registerDecorator, ValidationArguments, ValidationOptions } from 'class-validator';

/**
 * Validates if a string is a valid Brazilian CNPJ number.
 * @param validationOptions The validation options
 * @returns True if the string is a valid CNPJ, false otherwise
 */
export function IsCnpj(validationOptions?: ValidationOptions) {
    return function (object: object, propertyName: string) {
        registerDecorator({
            name: 'isCnpj',
            target: object.constructor,
            propertyName: propertyName,
            options: validationOptions,
            validator: {
                validate(value: any) {
                    if (typeof value !== 'string') return false;

                    const cnpj = value.replace(/[^\d]+/g, '');
                    if (cnpj.length !== 14) return false;

                    if (/^(\d)\1{13}$/.test(cnpj)) return false;

                    let size = cnpj.length - 2;
                    let numbers = cnpj.substring(0, size);
                    const digits = cnpj.substring(size);
                    let sum = 0;
                    let pos = size - 7;

                    for (let i = size; i >= 1; i--) {
                        sum += parseInt(numbers.charAt(size - i)) * pos--;
                        if (pos < 2) pos = 9;
                    }

                    let result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
                    if (result !== parseInt(digits.charAt(0))) return false;

                    size = size + 1;
                    numbers = cnpj.substring(0, size);
                    sum = 0;
                    pos = size - 7;

                    for (let i = size; i >= 1; i--) {
                        sum += parseInt(numbers.charAt(size - i)) * pos--;
                        if (pos < 2) pos = 9;
                    }

                    result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
                    if (result !== parseInt(digits.charAt(1))) return false;

                    return true;
                },
                defaultMessage(args: ValidationArguments) {
                    return `${args.property} must be a valid Brazilian CNPJ`;
                },
            },
        });
    };
}
