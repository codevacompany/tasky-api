import { Injectable } from '@nestjs/common';
import { ILike } from 'typeorm';
import { TenantBoundBaseService } from '../../shared/common/tenant-bound.base-service';
import { CustomConflictException } from '../../shared/exceptions/http-exception';
import { PaginatedResponse, QueryOptions } from '../../shared/types/http';
import { DepartmentRepository } from './department.repository';
import { CreateDepartmentDto } from './dtos/create-department.dto';
import { UpdateDepartmentDto } from './dtos/update-department.dto';
import { Department } from './entities/department.entity';
import { User } from '../user/entities/user.entity';

@Injectable()
export class DepartmentService extends TenantBoundBaseService<Department> {
    constructor(private departmentRepository: DepartmentRepository) {
        super(departmentRepository);
    }

    async findMany(
        user: User,
        options?: QueryOptions<Department>,
    ): Promise<PaginatedResponse<Department>> {
        if (options.where?.name) {
            options.where.name = ILike(`%${options.where.name}%`);
        }

        return super.findMany(user, options);
    }

    async findByName(user: User, name: string): Promise<Department> {
        return this.findOne(user, {
            where: {
                name,
            },
        });
    }

    async create(user: User, dto: CreateDepartmentDto) {
        const exists = await this.findOne(user, {
            where: { name: dto.name },
        });

        if (exists) {
            throw new CustomConflictException({
                code: 'name-already-registered',
                message: 'This name is already registered',
            });
        }

        return this.save(user, dto);
    }

    async update(user: User, id: number, dto: UpdateDepartmentDto) {
        return super.update(user, id, dto);
    }

    async delete(user: User, id: number): Promise<void> {
        return this.delete(user, id);
    }
}
