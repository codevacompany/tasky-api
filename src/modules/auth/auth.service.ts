import { Inject, Injectable, forwardRef } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { JwtPayload } from 'jsonwebtoken';
import { AccessProfile } from '../../shared/common/access-profile';
import {
    CustomForbiddenException,
    CustomNotFoundException,
    CustomUnauthorizedException,
} from '../../shared/exceptions/http-exception';
import { EmailService } from '../../shared/services/email/email.service';
import { EncryptionService } from '../../shared/services/encryption/encryption.service';
import { TokenService } from '../../shared/services/token/token.service';
import { UserService } from '../user/user.service';
import { VerificationCodeService } from '../verification-code/verification-code.service';
import { TenantSubscriptionService } from '../tenant-subscription/tenant-subscription.service';
import { LoginDto } from './dtos/login.dto';
import { VerificationCodeValidationDto } from './dtos/verification-code-validation.dto';
import { ChangePasswordDto } from './dtos/change-password.dto';
import { AdminResetPasswordDto } from './dtos/admin-reset-password.dto';

@Injectable()
export class AuthService {
    constructor(
        @Inject(forwardRef(() => UserService))
        private userService: UserService,
        private encryptionService: EncryptionService,
        private tokenService: TokenService,
        private verificationCodeService: VerificationCodeService,
        private emailService: EmailService,
        private readonly jwtService: JwtService,
        private tenantSubscriptionService: TenantSubscriptionService,
    ) {}
    async login(body: LoginDto) {
        const accessProfile = new AccessProfile();
        const email = body.email.toLowerCase();
        const user = await this.userService.findByEmail(accessProfile, email, {
            tenantAware: false,
        });

        if (!user) {
            throw new CustomUnauthorizedException({
                code: 'invalid-email-or-password',
                message: 'Invalid email or password',
            });
        }

        const passwordMatch = await this.encryptionService.compare(body.password, user.password);

        if (!passwordMatch) {
            throw new CustomUnauthorizedException({
                code: 'invalid-email-or-password',
                message: 'Invalid email or password',
            });
        }

        // Get tenant permissions based on current subscription
        const tenantPermissions = await this.tenantSubscriptionService.getTenantPermissions(
            user.tenantId,
        );

        const tokenSub: Record<string, unknown> = {
            userId: user.id,
            tenantId: user.tenantId,
        };

        const token = this.tokenService.createPair(tokenSub);

        delete user.password;

        return {
            token,
            user: { ...user, permissions: tenantPermissions },
        };
    }

    async refreshToken(refreshToken: string) {
        const { sub: accessToken } = this.tokenService.verify(refreshToken) as JwtPayload;

        if (!accessToken) {
            throw new CustomForbiddenException({
                code: 'invalid-refresh-token',
                message: 'Invalid refresh token',
            });
        }

        const decodeResponse = this.tokenService.decode(accessToken);

        if (!decodeResponse || !decodeResponse.sub) {
            throw new CustomForbiddenException({
                code: 'invalid-refresh-token',
                message: 'Invalid refresh token',
            });
        }

        const { userId, tenantId } = decodeResponse.sub;

        if (!userId) {
            throw new CustomForbiddenException({
                code: 'invalid-refresh-token',
                message: 'Invalid refresh token',
            });
        }

        const user = await this.userService.findById(userId);

        if (!user) {
            throw new CustomForbiddenException({
                code: 'invalid-user',
                message: 'Invalid user',
            });
        }

        return this.tokenService.createPair({ userId, tenantId });
    }

    async requestPasswordReset(accessProfile: AccessProfile, email: string) {
        const user = await this.userService.findByEmail(accessProfile, email, {
            tenantAware: false,
        });

        if (!user) {
            throw new CustomNotFoundException({
                code: 'email-not-found',
                message: 'Email not found',
            });
        }

        const verificationCode = await this.verificationCodeService.generate();

        if (process.env.APP_ENV !== 'test') {
            try {
                await this.emailService.sendMail({
                    subject: 'Código de Verificação - Redefinição de Senha',
                    html: this.emailService.compileTemplate('verification-code', {
                        firstName: user.firstName,
                        lastName: user.lastName,
                        verificationCode: verificationCode,
                    }),
                    to: email,
                });
            } catch (error) {
                console.error('Error sending verification code email:', error);
            }
        }

        await this.verificationCodeService.insert(verificationCode, email, user.tenantId);

        return { message: `Verification code sent to ${email}` };
    }

    async validateVerificationCode(
        accessProfile: AccessProfile,
        { code, email }: VerificationCodeValidationDto,
    ) {
        const user = await this.userService.findByEmail(accessProfile, email, {
            tenantAware: false,
        });

        if (!user) {
            throw new CustomUnauthorizedException({
                code: 'invalid-email',
                message: 'Invalid email',
            });
        }

        const validCode = await this.verificationCodeService.validate(accessProfile, code, email);

        if (!validCode.valid) {
            throw new CustomNotFoundException({
                code: 'invalid-or-expired-code',
                message: 'This code is invalid or has expired',
            });
        }

        const tokenSub: Record<string, unknown> = {
            code: validCode.code,
            userId: user.id,
            email: user.email,
        };

        const token = this.tokenService.create(tokenSub, { expiresIn: '1h' });

        return {
            verificationCode: validCode,
            token,
        };
    }

    async changePassword(accessProfile: AccessProfile, changePasswordDto: ChangePasswordDto) {
        const user = await this.userService.findById(accessProfile.userId);

        if (!user) {
            throw new CustomNotFoundException({
                code: 'user-not-found',
                message: 'User not found',
            });
        }

        const isCurrentPasswordValid = this.encryptionService.compareSync(
            changePasswordDto.currentPassword,
            user.password,
        );

        if (!isCurrentPasswordValid) {
            throw new CustomUnauthorizedException({
                code: 'invalid-current-password',
                message: 'Current password is incorrect',
            });
        }

        const hashedNewPassword = this.encryptionService.hashSync(changePasswordDto.newPassword);

        await this.userService.update(accessProfile, accessProfile.userId, {
            password: hashedNewPassword,
        });

        return { message: 'Password changed successfully' };
    }

    async adminResetPassword(
        accessProfile: AccessProfile,
        userId: number,
        adminResetPasswordDto: AdminResetPasswordDto,
    ): Promise<{ message: string }> {
        const user = await this.userService.findById(userId);

        if (!user) {
            throw new CustomNotFoundException({
                code: 'user-not-found',
                message: 'User not found',
            });
        }

        const hashedPassword = this.encryptionService.hashSync(adminResetPasswordDto.newPassword);

        await this.userService.superAdminUpdate(accessProfile, userId, {
            password: hashedPassword,
        });

        try {
            const html = this.emailService.compileTemplate('password-reset', {
                firstName: user.firstName,
                lastName: user.lastName,
                newPassword: adminResetPasswordDto.newPassword,
            });

            await this.emailService.sendMail({
                to: user.email,
                subject: 'Senha Redefinida - Tasky System',
                html,
            });
        } catch (error) {
            console.error('Failed to send password reset email:', error);
        }

        return {
            message: 'Password reset successfully',
        };
    }

    async resetPasswordWithToken(token: string, newPassword: string) {
        let decodedToken: JwtPayload;

        try {
            decodedToken = this.tokenService.verify(token) as JwtPayload;
        } catch (error) {
            throw new CustomForbiddenException({
                code: 'invalid-or-expired-token',
                message: 'This token is invalid or has expired',
            });
        }

        // Validate token structure
        if (!decodedToken.sub || typeof decodedToken.sub !== 'object') {
            throw new CustomForbiddenException({
                code: 'invalid-token',
                message: 'Invalid token format',
            });
        }

        const { userId, email, code } = decodedToken.sub as any;

        if (!userId || !email || !code) {
            throw new CustomForbiddenException({
                code: 'invalid-token',
                message: 'Invalid token',
            });
        }

        // Verify user exists
        const accessProfile = new AccessProfile();
        const user = await this.userService.findByEmail(accessProfile, email, {
            tenantAware: false,
        });

        if (!user || user.id !== userId) {
            throw new CustomNotFoundException({
                code: 'user-not-found',
                message: 'User not found',
            });
        }

        // Validate that the verification code is still valid
        const validCode = await this.verificationCodeService.validate(accessProfile, code, email);

        if (!validCode.valid) {
            throw new CustomForbiddenException({
                code: 'invalid-or-expired-code',
                message: 'This verification code is invalid or has expired',
            });
        }

        // Mark verification code as used
        if (validCode.id) {
            await this.verificationCodeService.markAsUsed(validCode.id);
        }

        // Hash and update password
        const hashedPassword = this.encryptionService.hashSync(newPassword);

        await this.userService.update(accessProfile, userId, {
            password: hashedPassword,
        });

        return { message: 'Password reset successfully' };
    }
}
