import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GlobalAdminGuard } from '../../shared/guards/global-admin.guard';
import { SubscriptionRequiredGuard } from '../../shared/guards/subscription-required.guard';
import { TermsAcceptanceRequiredGuard } from '../../shared/guards/terms-acceptance-required.guard';
import { EmailModule } from '../../shared/services/email/email.module';
import { EncryptionModule } from '../../shared/services/encryption/encryption.module';
import { AuthModule } from '../auth/auth.module';
import { RoleModule } from '../role/role.module';
import { TenantModule } from '../tenant/tenant.module';
import { TenantSubscriptionModule } from '../tenant-subscription/tenant-subscription.module';
import { User } from './entities/user.entity';
import { UserController } from './user.controller';
import { UserRepository } from './user.repository';
import { UserService } from './user.service';

@Module({
    imports: [
        TypeOrmModule.forFeature([User]),
        EncryptionModule,
        EmailModule,
        RoleModule,
        forwardRef(() => AuthModule),
        forwardRef(() => TenantModule),
        forwardRef(() => TenantSubscriptionModule),
    ],
    exports: [UserService, UserRepository],
    controllers: [UserController],
    providers: [
        UserService,
        UserRepository,
        GlobalAdminGuard,
        SubscriptionRequiredGuard,
        TermsAcceptanceRequiredGuard,
    ],
})
export class UserModule {}
