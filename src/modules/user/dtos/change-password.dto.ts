import { IsNotEmpty, IsString } from 'class-validator';
import { IsPasswordStrong } from '../../../shared/decorators/password-strength.decorator';

export class ChangePasswordDto {
    @IsNotEmpty()
    @IsString()
    currentPassword: string;

    @IsNotEmpty()
    @IsString()
    @IsPasswordStrong()
    newPassword: string;
}
