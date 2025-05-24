import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Tenant } from './entities/tenant.entity';
import { TenantController } from './tenant.controller';
import { TenantRepository } from './tenant.repository';
import { TenantService } from './tenant.service';
import { LegalDocumentModule } from '../legal-document/legal-document.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([Tenant]),
        LegalDocumentModule,
    ],
    exports: [TenantService, TenantRepository],
    controllers: [TenantController],
    providers: [TenantService, TenantRepository],
})
export class TenantModule {}
