import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { Department } from './entities/department.entity';

@Injectable()
export class DepartmentRepository extends Repository<Department> {
    constructor(private dataSource: DataSource) {
        super(Department, dataSource.createEntityManager());
    }
}
