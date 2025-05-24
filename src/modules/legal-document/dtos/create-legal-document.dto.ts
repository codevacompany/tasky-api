import { IsBoolean, IsDate, IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { LegalDocumentType } from '../entities/legal-document.entity';

export class CreateLegalDocumentDto {
    @IsNotEmpty()
    @IsEnum(LegalDocumentType)
    type: LegalDocumentType;

    @IsNotEmpty()
    @IsString()
    version: string;

    @IsNotEmpty()
    @IsString()
    content: string;

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
