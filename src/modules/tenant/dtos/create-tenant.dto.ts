import { IsBoolean, IsDate, IsEmail, IsNotEmpty, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateTenantDto {
    @IsNotEmpty()
    @IsString()
    @MinLength(2)
    name: string;

    @IsNotEmpty()
    @IsString()
    @MinLength(2)
    @MaxLength(3)
    customKey: string;

    @IsOptional()
    @IsEmail()
    email?: string;

    @IsOptional()
    @IsString()
    cnpj?: string;

    @IsOptional()
    @IsString()
    phoneNumber?: string;

    @IsOptional()
    @IsString()
    cep?: string;

    @IsOptional()
    @IsString()
    state?: string;

    @IsOptional()
    @IsString()
    city?: string;

    @IsOptional()
    @IsString()
    neighborhood?: string;

    @IsOptional()
    @IsString()
    street?: string;

    @IsOptional()
    @IsString()
    number?: string;

    @IsOptional()
    @IsString()
    complement?: string;

    @IsOptional()
    @IsString()
    companySize?: string;

    @IsOptional()
    @IsString()
    mainActivity?: string;

    // Consent tracking fields
    @IsOptional()
    @IsBoolean()
    termsAccepted?: boolean;

    @IsOptional()
    @IsDate()
    termsAcceptedAt?: Date;

    @IsOptional()
    @IsString()
    termsVersion?: string;

    @IsOptional()
    @IsBoolean()
    privacyPolicyAccepted?: boolean;

    @IsOptional()
    @IsDate()
    privacyPolicyAcceptedAt?: Date;

    @IsOptional()
    @IsString()
    privacyPolicyVersion?: string;
}
