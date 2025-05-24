import { IsBoolean, IsNotEmpty, IsString } from 'class-validator';

export class UpdateTenantConsentDto {
    @IsNotEmpty()
    @IsBoolean()
    termsAccepted: boolean;

    @IsNotEmpty()
    @IsString()
    termsVersion: string;

    @IsNotEmpty()
    @IsBoolean()
    privacyPolicyAccepted: boolean;

    @IsNotEmpty()
    @IsString()
    privacyPolicyVersion: string;
}
