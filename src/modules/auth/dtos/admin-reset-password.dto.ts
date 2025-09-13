import { IsString, MinLength, IsNotEmpty } from 'class-validator';

export class AdminResetPasswordDto {
    @IsString()
    @IsNotEmpty()
    @MinLength(8, { message: 'Password must be at least 8 characters long' })
    newPassword: string;
}
