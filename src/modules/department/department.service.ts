import { Injectable } from '@nestjs/common';
import { CustomConflictException } from '../../shared/exceptions/http-exception';
import { DepartmentRepository } from './department.repository';
import { CreateDepartmentDto } from './dtos/create-department.dto';
import { UpdateDepartmentDto } from './dtos/update-department.dto';
import { Department } from './entities/department.entity';

@Injectable()
export class DepartmentService {
    constructor(private departmentRepository: DepartmentRepository) {}

    async findAll(): Promise<Department[]> {
        return await this.departmentRepository.find();
    }

    async findByName(name: string): Promise<Department> {
        return await this.departmentRepository.findOne({
            where: {
                name,
            },
        });
    }

    async create(department: CreateDepartmentDto) {
        const departmentExists = await this.departmentRepository.findOne({
            where: {
                name: department.name,
            },
        });

        if (departmentExists) {
            throw new CustomConflictException({
                code: 'name-already-registered',
                message: 'This name is already registered',
            });
        }

        await this.departmentRepository.save(department);
    }

    async update(id: number, department: UpdateDepartmentDto) {
        await this.departmentRepository.update(id, department);

        return {
            message: 'Successfully updated!',
            departmentId: id,
        };
    }
}
