import { IsBoolean, IsDate, IsEnum, IsOptional, IsString } from 'class-validator';
import { LegalDocumentType } from '../entities/legal-document.entity';

export class UpdateLegalDocumentDto {
    @IsOptional()
    @IsEnum(LegalDocumentType)
    type?: LegalDocumentType;

    @IsOptional()
    @IsString()
    version?: string;

    @IsOptional()
    @IsString()
    content?: string;

    @IsOptional()
    @IsBoolean()
    isActive?: boolean;

    @IsOptional()
    @IsDate()
    effectiveDate?: Date;

    @IsOptional()
    @IsBoolean()
    requiresExplicitConsent?: boolean;
}
