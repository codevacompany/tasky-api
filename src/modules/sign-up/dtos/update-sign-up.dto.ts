import {
    IsEmail,
    IsNotEmpty,
    IsString,
    MinLength,
    ValidateIf,
} from 'class-validator';
import { IsCnpj } from '../../../shared/validators/is-cnpj.validator';

export class UpdateSignUpDto {
    @IsString()
    @IsNotEmpty()
    contactName: string;

    @IsEmail()
    @IsNotEmpty()
    contactEmail: string;

    @IsString()
    @IsNotEmpty()
    @MinLength(10)
    contactPhone: string;

    // Required on PATCH, but allowed to be an empty string (to clear company/CNPJ info).
    @IsString()
    @ValidateIf((_, v) => String(v).trim() !== '')
    @IsCnpj({ message: 'Invalid CNPJ' })
    cnpj: string;
}
