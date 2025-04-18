import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { Tenant } from './entities/tenant.entity';

@Injectable()
export class TenantRepository extends Repository<Tenant> {
    constructor(private dataSource: DataSource) {
        super(Tenant, dataSource.createEntityManager());
    }
}
