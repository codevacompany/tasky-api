import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Repository } from 'typeorm';
import { AccessProfile } from '../../shared/common/access-profile';
import { TenantBoundBaseService } from '../../shared/common/tenant-bound.base-service';
import {
    CustomBadRequestException,
    CustomConflictException,
} from '../../shared/exceptions/http-exception';
import { PaginatedResponse, QueryOptions } from '../../shared/types/http';
import { User } from '../user/entities/user.entity';
import { DepartmentRepository } from './department.repository';
import { CreateDepartmentDto } from './dtos/create-department.dto';
import { UpdateDepartmentDto } from './dtos/update-department.dto';
import { Department } from './entities/department.entity';

@Injectable()
export class DepartmentService extends TenantBoundBaseService<Department> {
    constructor(
        private departmentRepository: DepartmentRepository,
        @InjectRepository(User)
        private userRepository: Repository<User>,
    ) {
        super(departmentRepository);
    }

    async findMany(
        acessProfile: AccessProfile,
        options?: QueryOptions<Department>,
    ): Promise<PaginatedResponse<Department>> {
        if (options.where?.name) {
            options.where.name = ILike(`%${options.where.name}%`);
        }

        return super.findMany(acessProfile, options);
    }

    async findByName(acessProfile: AccessProfile, name: string): Promise<Department> {
        return this.findOne(acessProfile, {
            where: {
                name,
            },
        });
    }

    async create(acessProfile: AccessProfile, dto: CreateDepartmentDto) {
        const exists = await this.findOne(acessProfile, {
            where: { name: dto.name },
        });

        if (exists) {
            throw new CustomConflictException({
                code: 'name-already-registered',
                message: 'This name is already registered',
            });
        }

        return this.save(acessProfile, dto);
    }

    async update(acessProfile: AccessProfile, id: number, dto: UpdateDepartmentDto) {
        return super.update(acessProfile, id, dto);
    }

    async delete(acessProfile: AccessProfile, id: number): Promise<void> {
        // Check if there are users assigned to this department
        const usersInDepartment = await this.userRepository.count({
            where: {
                departmentId: id,
                tenantId: acessProfile.tenantId,
            },
        });

        if (usersInDepartment > 0) {
            throw new CustomBadRequestException({
                code: 'department-in-use',
                message: `Cannot delete department because it has ${usersInDepartment} user(s) assigned`,
            });
        }

        await super.delete(acessProfile, id);
    }
}
