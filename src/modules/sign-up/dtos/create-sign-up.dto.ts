import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';
import { IsCnpj } from '../../../shared/validators/is-cnpj.validator';
import { IsCpf } from '../../../shared/validators/is-cpf.validator';

export class CreateSignUpDto {
    @IsString()
    @IsNotEmpty()
    companyName: string;

    @IsEmail()
    @IsNotEmpty()
    email: string;

    @IsString()
    @IsNotEmpty()
    @IsCnpj({ message: 'Invalid CNPJ' })
    cnpj: string;

    @IsString()
    @IsNotEmpty()
    contactName: string;

    @IsString()
    @IsNotEmpty()
    @IsCpf({ message: 'This CPF is invalid' })
    contactCpf: string;

    @IsEmail()
    @IsNotEmpty()
    contactEmail: string;

    @IsString()
    @IsNotEmpty()
    @MinLength(10)
    contactPhone: string;
}
