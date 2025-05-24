import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { SignUp } from './entities/sign-up.entity';

@Injectable()
export class SignUpRepository extends Repository<SignUp> {
    constructor(private dataSource: DataSource) {
        super(SignUp, dataSource.createEntityManager());
    }
}
