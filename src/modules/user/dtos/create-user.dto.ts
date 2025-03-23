import { IsBoolean, IsEmail, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';
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

    @IsBoolean()
    @IsOptional()
    isAdmin?: boolean;

    @IsBoolean()
    @IsOptional()
    isActive?: boolean;
}
