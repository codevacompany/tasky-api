import {
    IsBoolean,
    IsEmail,
    IsInt,
    IsNotEmpty,
    IsOptional,
    IsString,
    MaxLength,
    MinLength,
} from 'class-validator';
import { LettersOnly } from '../../../shared/decorators/letters-only.decorator';
import { IsPasswordStrong } from '../../../shared/decorators/password-strength.decorator';

export class UpdateUserDto {
    @IsOptional()
    @IsNotEmpty()
    @IsString()
    @MinLength(2)
    @MaxLength(15)
    @LettersOnly()
    firstName?: string;

    @IsOptional()
    @IsNotEmpty()
    @IsString()
    @MinLength(2)
    @MaxLength(15)
    @LettersOnly()
    lastName?: string;

    @IsOptional()
    @IsNotEmpty()
    @IsEmail()
    email?: string;

    @IsOptional()
    @IsNotEmpty()
    @IsString()
    @IsPasswordStrong()
    password?: string;

    @IsOptional()
    @IsInt()
    departmentId?: number;

    @IsBoolean()
    @IsOptional()
    isAdmin?: boolean;

    @IsBoolean()
    @IsOptional()
    isActive?: boolean;
}
