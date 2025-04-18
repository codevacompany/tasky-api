import { Injectable } from '@nestjs/common';
import { ILike } from 'typeorm';
import { TenantBoundBaseService } from '../../shared/common/tenant-bound.base-service';
import { CustomConflictException } from '../../shared/exceptions/http-exception';
import { PaginatedResponse, QueryOptions } from '../../shared/types/http';
import { User } from '../user/entities/user.entity';
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
        user: User,
        options?: QueryOptions<Category>,
    ): Promise<PaginatedResponse<Category>> {
        if (options.where?.name) {
            options.where.name = ILike(`%${options.where.name}%`);
        }

        return super.findMany(user, options);
    }

    async findByName(user: User,name: string): Promise<Category> {
        return await this.findOne(user,{
            where: {
                name,
            },
        });
    }

    async create(user: User, categoryDto: CreateCategoryDto) {
        const exists = await this.findOne(user, {
            where: { name: categoryDto.name },
        });
        if (exists) {
            throw new CustomConflictException({
                code: 'name-already-registered',
                message: 'This name is already registered',
            });
        }

        return this.save(user, categoryDto);
    }

    async update(user: User, id: number, updateDto: UpdateCategoryDto) {
        return await super.update(user, id, updateDto);
    }
}
