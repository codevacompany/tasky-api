import {
    IsBoolean,
    IsEmail,
    IsInt,
    IsNotEmpty,
    IsOptional,
    IsString,
    MinLength,
} from 'class-validator';
import { LettersOnly } from '../../../shared/decorators/letters-only.decorator';

export class CreateUserDto {
    @IsNotEmpty()
    @IsString()
    @MinLength(2)
    @LettersOnly()
    firstName: string;

    @IsNotEmpty()
    @IsString()
    @MinLength(2)
    @LettersOnly()
    lastName: string;

    @IsNotEmpty()
    @IsEmail()
    email: string;

    @IsNotEmpty()
    @IsString()
    // @IsPasswordStrong()
    password: string;

    @IsNotEmpty()
    departmentId?: number;

    @IsInt()
    @IsOptional()
    roleId?: number;

    @IsBoolean()
    @IsOptional()
    isActive?: boolean;
}
