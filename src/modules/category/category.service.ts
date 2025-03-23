import { Injectable } from '@nestjs/common';
import { CustomConflictException } from '../../shared/exceptions/http-exception';
import { CategoryRepository } from './category.repository';
import { CreateCategoryDto } from './dtos/create-category.dto';
import { UpdateCategoryDto } from './dtos/update-category.dto';
import { Category } from './entities/category.entity';

@Injectable()
export class CategoryService {
    constructor(private categoryRepository: CategoryRepository) {}

    async findAll(): Promise<Category[]> {
        return await this.categoryRepository.find();
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
}
