import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Tenant } from './entities/tenant.entity';
import { TenantController } from './tenant.controller';
import { TenantRepository } from './tenant.repository';
import { TenantService } from './tenant.service';
import { LegalDocumentModule } from '../legal-document/legal-document.module';
import { GlobalAdminGuard } from '../../shared/guards/global-admin.guard';
import { RoleModule } from '../role/role.module';
import { User } from '../user/entities/user.entity';
import { Ticket } from '../ticket/entities/ticket.entity';
import { Department } from '../department/entities/department.entity';
import { Role } from '../role/entities/role.entity';

@Module({
    imports: [
        TypeOrmModule.forFeature([Tenant, User, Ticket, Department, Role]),
        LegalDocumentModule,
        RoleModule, // Required for GlobalAdminGuard
    ],
    exports: [TenantService, TenantRepository],
    controllers: [TenantController],
    providers: [TenantService, TenantRepository, GlobalAdminGuard],
})
export class TenantModule {}
