import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { UserPreference } from './entities/user-preference.entity';

@Injectable()
export class UserPreferenceRepository extends Repository<UserPreference> {
    constructor(private dataSource: DataSource) {
        super(UserPreference, dataSource.createEntityManager());
    }
}
