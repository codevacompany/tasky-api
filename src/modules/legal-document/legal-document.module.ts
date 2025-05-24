import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RoleModule } from '../role/role.module';
import { LegalDocument } from './entities/legal-document.entity';
import { LegalDocumentController } from './legal-document.controller';
import { LegalDocumentRepository } from './legal-document.repository';
import { LegalDocumentService } from './legal-document.service';

@Module({
    imports: [
        TypeOrmModule.forFeature([LegalDocument]),
        RoleModule,
    ],
    controllers: [LegalDocumentController],
    providers: [LegalDocumentService, LegalDocumentRepository],
    exports: [LegalDocumentService],
})
export class LegalDocumentModule {}
