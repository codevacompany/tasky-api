import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { LegalDocument } from './entities/legal-document.entity';

@Injectable()
export class LegalDocumentRepository extends Repository<LegalDocument> {
    constructor(private dataSource: DataSource) {
        super(LegalDocument, dataSource.createEntityManager());
    }
}
