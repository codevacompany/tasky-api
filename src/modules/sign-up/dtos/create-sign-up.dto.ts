import { IsBoolean, IsEmail, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';
import { IsCnpj } from '../../../shared/validators/is-cnpj.validator';

export class CreateSignUpDto {
    @IsString()
    @IsNotEmpty()
    @IsCnpj({ message: 'Invalid CNPJ' })
    cnpj: string;

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

    // Consent fields
    @IsBoolean()
    @IsNotEmpty()
    termsAccepted: boolean;

    @IsString()
    @IsOptional()
    termsVersion?: string;

    @IsBoolean()
    @IsNotEmpty()
    privacyPolicyAccepted: boolean;

    @IsString()
    @IsOptional()
    privacyPolicyVersion?: string;
}
