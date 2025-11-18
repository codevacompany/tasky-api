import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Repository } from 'typeorm';
import { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity';
import { AccessProfile } from '../../shared/common/access-profile';
import { TenantBoundBaseService } from '../../shared/common/tenant-bound.base-service';
import {
    CustomBadRequestException,
    CustomConflictException,
    CustomNotFoundException,
} from '../../shared/exceptions/http-exception';
import { FindOneQueryOptions, PaginatedResponse, QueryOptions } from '../../shared/types/http';
import { Ticket } from '../ticket/entities/ticket.entity';
import { CategoryRepository } from './category.repository';
import { CreateCategoryDto } from './dtos/create-category.dto';
import { UpdateCategoryDto } from './dtos/update-category.dto';
import { Category } from './entities/category.entity';

@Injectable()
export class CategoryService extends TenantBoundBaseService<Category> {
    constructor(
        private categoryRepository: CategoryRepository,
        @InjectRepository(Ticket)
        private ticketRepository: Repository<Ticket>,
    ) {
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

    async findByName(
        acessProfile: AccessProfile,
        options: FindOneQueryOptions<Category>,
    ): Promise<Category> {
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

    /**
     * Find category by UUID (public-facing identifier)
     */
    async findByUuid(accessProfile: AccessProfile, uuid: string): Promise<Category> {
        const category = await super.findByUuid(accessProfile, uuid);

        if (!category) {
            throw new CustomNotFoundException({
                code: 'not-found',
                message: 'Category not found.',
            });
        }

        return category;
    }

    /**
     * Update category by UUID (public-facing identifier)
     */
    async updateCategoryByUuid(
        accessProfile: AccessProfile,
        uuid: string,
        dto: UpdateCategoryDto,
    ): Promise<Category> {
        await super.updateByUuid(accessProfile, uuid, dto as QueryDeepPartialEntity<Category>);
        return this.findByUuid(accessProfile, uuid);
    }

    /**
     * Delete category by UUID (public-facing identifier)
     */
    async deleteByUuid(accessProfile: AccessProfile, uuid: string): Promise<void> {
        const category = await this.findByUuidOrFail(accessProfile, uuid);

        // Check if there are tickets using this category
        const ticketsWithCategory = await this.ticketRepository.count({
            where: {
                categoryId: category.id,
                tenantId: accessProfile.tenantId,
            },
        });

        if (ticketsWithCategory > 0) {
            throw new CustomBadRequestException({
                code: 'category-in-use',
                message: `Cannot delete category because it is being used by ${ticketsWithCategory} ticket(s)`,
            });
        }

        await super.deleteByUuid(accessProfile, uuid);
    }

    async delete(accessProfile: AccessProfile, id: number): Promise<void> {
        // Check if there are tickets using this category
        const ticketsWithCategory = await this.ticketRepository.count({
            where: {
                categoryId: id,
                tenantId: accessProfile.tenantId,
            },
        });

        if (ticketsWithCategory > 0) {
            throw new CustomBadRequestException({
                code: 'category-in-use',
                message: `Cannot delete category because it is being used by ${ticketsWithCategory} ticket(s)`,
            });
        }

        await super.delete(accessProfile, id);
    }
}
