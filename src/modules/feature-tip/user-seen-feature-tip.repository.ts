import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { UserSeenFeatureTip } from './entities/user-seen-feature-tip.entity';

@Injectable()
export class UserSeenFeatureTipRepository extends Repository<UserSeenFeatureTip> {
    constructor(private dataSource: DataSource) {
        super(UserSeenFeatureTip, dataSource.createEntityManager());
    }
}
