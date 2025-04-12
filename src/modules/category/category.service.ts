import { Injectable } from '@nestjs/common';
import { ILike } from 'typeorm';
import { CustomConflictException } from '../../shared/exceptions/http-exception';
import { PaginatedResponse, QueryOptions } from '../../shared/types/http';
import { CategoryRepository } from './category.repository';
import { CreateCategoryDto } from './dtos/create-category.dto';
import { UpdateCategoryDto } from './dtos/update-category.dto';
import { Category } from './entities/category.entity';

@Injectable()
export class CategoryService {
    constructor(private categoryRepository: CategoryRepository) {}

    async findAll(
        where?: { name: string },
        options?: QueryOptions,
    ): Promise<PaginatedResponse<Category>> {
        const query = this.buildQuery(where);

        const [items, total] = await this.categoryRepository.findAndCount({
            where: query.where,
            skip: (options.page - 1) * options.limit,
            take: options.limit,
        });

        return {
            items,
            total,
            page: options.page,
            limit: options.limit,
            totalPages: Math.ceil(total / options.limit),
        };
    }

    async findByName(name: string): Promise<Category> {
        return await this.categoryRepository.findOne({
            where: {
                name,
            },
        });
    }

    async create(category: CreateCategoryDto) {
        category.name = category.name.toLowerCase();

        const categoryExists = await this.categoryRepository.findOne({
            where: {
                name: category.name,
            },
        });

        if (categoryExists) {
            throw new CustomConflictException({
                code: 'name-already-registered',
                message: 'This name is already registered',
            });
        }

        await this.categoryRepository.save(category);
    }

    async update(id: number, category: UpdateCategoryDto) {
        await this.categoryRepository.update(id, category);

        return {
            message: 'Successfully updated!',
            categoryId: id,
        };
    }

    private buildQuery(where: { name: string }) {
        const queryWhere: any = { ...where };

        if (where.name) {
            queryWhere.name = ILike(`%${where.name}%`);
        }

        return { where: queryWhere };
    }
}
