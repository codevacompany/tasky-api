import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { StatusColumn } from './entities/status-column.entity';

@Injectable()
export class StatusColumnRepository extends Repository<StatusColumn> {
    constructor(private dataSource: DataSource) {
        super(StatusColumn, dataSource.createEntityManager());
    }
}
