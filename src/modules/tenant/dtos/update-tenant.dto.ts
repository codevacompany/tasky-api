import { IsEmail, IsNotEmpty, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateTenantDto {
    @IsOptional()
    @IsNotEmpty()
    @IsString()
    @MinLength(2)
    name?: string;

    @IsNotEmpty()
    @IsString()
    @MinLength(2)
    @MaxLength(3)
    customKey?: string;

    @IsOptional()
    @IsEmail()
    email?: string;

    @IsOptional()
    @IsString()
    cnpj?: string;
}
