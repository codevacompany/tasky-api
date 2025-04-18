import { IsBoolean, IsEmail, IsInt, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';
import { LettersOnly } from '../../../shared/decorators/letters-only.decorator';

export class SuperAdminCreateUserDto {
    @IsNotEmpty()
    @IsInt()
    tenantId: number;

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

    @IsNotEmpty()
    roleId?: number;

    @IsBoolean()
    @IsOptional()
    isAdmin?: boolean;

    @IsBoolean()
    @IsOptional()
    isActive?: boolean;
}
