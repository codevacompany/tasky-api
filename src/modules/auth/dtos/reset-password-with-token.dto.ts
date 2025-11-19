import { IsNotEmpty, IsString } from 'class-validator';
import { IsPasswordStrong } from '../../../shared/decorators/password-strength.decorator';

export class ResetPasswordWithTokenDto {
    @IsNotEmpty()
    @IsString()
    token: string;

    @IsNotEmpty()
    @IsString()
    @IsPasswordStrong()
    newPassword: string;
}

