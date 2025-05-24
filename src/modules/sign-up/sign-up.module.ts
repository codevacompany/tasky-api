import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GlobalAdminGuard } from '../../shared/guards/global-admin.guard';
import { CnpjModule } from '../../shared/services/cnpj/cnpj.module';
import { EmailModule } from '../../shared/services/email/email.module';
import { TokenModule } from '../../shared/services/token/token.module';
import { DepartmentModule } from '../department/department.module';
import { LegalDocumentModule } from '../legal-document/legal-document.module';
import { RoleModule } from '../role/role.module';
import { SubscriptionModule } from '../subscription/subscription.module';
import { TenantModule } from '../tenant/tenant.module';
import { UserModule } from '../user/user.module';
import { SignUp } from './entities/sign-up.entity';
import { SignUpController } from './sign-up.controller';
import { SignUpRepository } from './sign-up.repository';
import { SignUpService } from './sign-up.service';

@Module({
    imports: [
        TypeOrmModule.forFeature([SignUp]),
        TenantModule,
        EmailModule,
        CnpjModule,
        UserModule,
        RoleModule,
        DepartmentModule,
        LegalDocumentModule,
        SubscriptionModule,
        TokenModule,
    ],
    controllers: [SignUpController],
    providers: [SignUpService, SignUpRepository, GlobalAdminGuard],
    exports: [SignUpService],
})
export class SignUpModule {}
