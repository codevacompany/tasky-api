import { registerDecorator, ValidationArguments, ValidationOptions } from 'class-validator';

/**
 * Validates if a string is a valid Brazilian CPF number.
 * @param validationOptions The validation options
 * @returns True if the string is a valid CPF, false otherwise
 */
export function IsCpf(validationOptions?: ValidationOptions) {
    return function (object: object, propertyName: string) {
        registerDecorator({
            name: 'isCpf',
            target: object.constructor,
            propertyName: propertyName,
            options: validationOptions,
            validator: {
                validate(value: any, args: ValidationArguments) {
                    if (typeof value !== 'string') return false;

                    // CPF should have 11 digits
                    const cpf = value.replace(/[^\d]+/g, '');
                    if (cpf.length !== 11) return false;

                    // Check if all digits are the same
                    if (/^(\d)\1{10}$/.test(cpf)) return false;

                    // Validate first check digit
                    let sum = 0;
                    for (let i = 0; i < 9; i++) {
                        sum += parseInt(cpf.charAt(i)) * (10 - i);
                    }
                    let remainder = (sum * 10) % 11;
                    if (remainder === 10 || remainder === 11) remainder = 0;
                    if (remainder !== parseInt(cpf.charAt(9))) return false;

                    // Validate second check digit
                    sum = 0;
                    for (let i = 0; i < 10; i++) {
                        sum += parseInt(cpf.charAt(i)) * (11 - i);
                    }
                    remainder = (sum * 10) % 11;
                    if (remainder === 10 || remainder === 11) remainder = 0;
                    if (remainder !== parseInt(cpf.charAt(10))) return false;

                    return true;
                },
                defaultMessage(args: ValidationArguments) {
                    return `${args.property} must be a valid Brazilian CPF`;
                },
            },
        });
    };
}
