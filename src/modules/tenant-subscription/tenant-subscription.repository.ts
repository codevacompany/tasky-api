import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { TenantSubscription } from './entities/tenant-subscription.entity';

@Injectable()
export class TenantSubscriptionRepository extends Repository<TenantSubscription> {
    constructor(private dataSource: DataSource) {
        super(TenantSubscription, dataSource.createEntityManager());
    }
}
