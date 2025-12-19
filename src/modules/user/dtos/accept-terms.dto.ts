import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class AcceptTermsDto {
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

