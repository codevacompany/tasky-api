import { Injectable } from '@nestjs/common';
import { ILike } from 'typeorm';
import { AccessProfile } from '../../shared/common/access-profile';
import { TenantBoundBaseService } from '../../shared/common/tenant-bound.base-service';
import { CustomConflictException } from '../../shared/exceptions/http-exception';
import { FindOneQueryOptions, PaginatedResponse, QueryOptions } from '../../shared/types/http';
import { CategoryRepository } from './category.repository';
import { CreateCategoryDto } from './dtos/create-category.dto';
import { UpdateCategoryDto } from './dtos/update-category.dto';
import { Category } from './entities/category.entity';

@Injectable()
export class CategoryService extends TenantBoundBaseService<Category> {
    constructor(private categoryRepository: CategoryRepository) {
        super(categoryRepository);
    }

    async findMany(
        acessProfile: AccessProfile,
        options?: QueryOptions<Category>,
    ): Promise<PaginatedResponse<Category>> {
        if (options.where?.name) {
            options.where.name = ILike(`%${options.where.name}%`);
        }

        return super.findMany(acessProfile, options);
    }

    async findByName(acessProfile: AccessProfile, options: FindOneQueryOptions<Category>): Promise<Category> {
        return await this.findOne(acessProfile, options);
    }

    async create(acessProfile: AccessProfile, categoryDto: CreateCategoryDto) {
        const exists = await this.findOne(acessProfile, {
            where: { name: categoryDto.name },
        });
        if (exists) {
            throw new CustomConflictException({
                code: 'name-already-registered',
                message: 'This name is already registered',
            });
        }

        return this.save(acessProfile, categoryDto);
    }

    async update(acessProfile: AccessProfile, id: number, updateDto: UpdateCategoryDto) {
        return await super.update(acessProfile, id, updateDto);
    }
}
