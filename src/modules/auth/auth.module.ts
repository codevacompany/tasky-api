import { Module, forwardRef } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { JwtStrategy } from '../../shared/guards/jwtStrategy';
import { GlobalAdminGuard } from '../../shared/guards/global-admin.guard';
import { EmailModule } from '../../shared/services/email/email.module';
import { EncryptionModule } from '../../shared/services/encryption/encryption.module';
import { TokenModule } from '../../shared/services/token/token.module';
import { UserModule } from '../user/user.module';
import { VerificationCodeModule } from '../verification-code/verification-code.module';
import { TenantSubscriptionModule } from '../tenant-subscription/tenant-subscription.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { RoleModule } from '../role/role.module';
@Module({
    imports: [
        EncryptionModule,
        TokenModule,
        forwardRef(() => UserModule),
        VerificationCodeModule,
        EmailModule,
        RoleModule,
        forwardRef(() => TenantSubscriptionModule),
        JwtModule.registerAsync({
            useFactory: () => ({
                secret: process.env.TOKEN_SECRET,
            }),
        }),
    ],
    controllers: [AuthController],
    providers: [AuthService, JwtStrategy, GlobalAdminGuard],
    exports: [AuthService],
})
export class AuthModule {}
