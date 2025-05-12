import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { CorrectionRequest } from './entities/correction-request-reason.entity';

@Injectable()
export class CorrectionRequestRepository extends Repository<CorrectionRequest> {
    constructor(private dataSource: DataSource) {
        super(CorrectionRequest, dataSource.createEntityManager());
    }
}
