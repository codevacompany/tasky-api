import { Body, Controller, Get, Post, Patch, Param, ParseIntPipe, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { VerificationCodeService } from '../verification-code/verification-code.service';
import { AuthService } from './auth.service';
import { LoginDto } from './dtos/login.dto';
import { RefreshTokenDto } from './dtos/refresh-token.dto';
import { ResetPasswordRequestDto } from './dtos/reset-password-request.dto';
import { VerificationCodeValidationDto } from './dtos/verification-code-validation.dto';
import { ResetPasswordWithTokenDto } from './dtos/reset-password-with-token.dto';
import { AccessProfile, GetAccessProfile } from '../../shared/common/access-profile';
import { ChangePasswordDto } from './dtos/change-password.dto';
import { AdminResetPasswordDto } from './dtos/admin-reset-password.dto';
import { TenantAdminGuard } from '../../shared/guards/tenant-admin.guard';
import { GlobalAdminGuard } from '../../shared/guards/global-admin.guard';
import { UUIDValidationPipe } from '../../shared/pipes/uuid-validation.pipe';

@Controller('auth')
export class AuthController {
    constructor(
        private readonly authService: AuthService,
        private readonly verificationCodeService: VerificationCodeService,
    ) {}

    @Post('login')
    login(@Body() body: LoginDto) {
        return this.authService.login(body);
    }

    @Get('whoami')
    @UseGuards(AuthGuard('jwt'))
    whoami(@GetAccessProfile() accessProfile: AccessProfile) {
        return this.authService.whoami(accessProfile);
    }

    @Post('reset-password/request')
    requestPasswordReset(@Body() { email }: ResetPasswordRequestDto) {
        const accessProfile = new AccessProfile();
        return this.authService.requestPasswordReset(accessProfile, email);
    }

    @Post('reset-password/validate')
    validateVerificationCode(@Body() body: VerificationCodeValidationDto) {
        const accessProfile = new AccessProfile();
        return this.authService.validateVerificationCode(accessProfile, body);
    }

    @Post('reset-password')
    resetPasswordWithToken(@Body() { token, newPassword }: ResetPasswordWithTokenDto) {
        return this.authService.resetPasswordWithToken(token, newPassword);
    }

    @Post('refresh-token')
    refreshToken(@Body() { refreshToken }: RefreshTokenDto) {
        return this.authService.refreshToken(refreshToken);
    }

    @Post('change-password')
    @UseGuards(AuthGuard('jwt'))
    changePassword(
        @GetAccessProfile() accessProfile: AccessProfile,
        @Body() changePasswordDto: ChangePasswordDto,
    ) {
        return this.authService.changePassword(accessProfile, changePasswordDto);
    }

    @Patch('admin/reset-password-uuid/:uuid')
    @UseGuards(AuthGuard('jwt'), TenantAdminGuard)
    adminResetPasswordWithRandomPassword(
        @GetAccessProfile() accessProfile: AccessProfile,
        @Param('uuid', UUIDValidationPipe) uuid: string,
    ) {
        return this.authService.adminResetPasswordWithRandomPassword(accessProfile, uuid);
    }

    @Patch('admin/reset-password/:userId')
    @UseGuards(AuthGuard('jwt'), GlobalAdminGuard)
    adminResetPassword(
        @GetAccessProfile() accessProfile: AccessProfile,
        @Param('userId', ParseIntPipe) userId: number,
        @Body() adminResetPasswordDto: AdminResetPasswordDto,
    ) {
        return this.authService.adminResetPassword(accessProfile, userId, adminResetPasswordDto);
    }
}
