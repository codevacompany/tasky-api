import { DeepPartial, FindOneOptions, FindOptionsWhere, Repository } from 'typeorm';
import { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity';
import { User } from '../../modules/user/entities/user.entity';
import { PaginatedResponse, QueryOptions } from '../types/http';
import { TenantBoundBaseEntity } from './tenant-bound.base-entity';

export abstract class TenantBoundBaseService<T extends TenantBoundBaseEntity> {
    constructor(protected readonly repository: Repository<T>) {}

    async findMany(user: User, options: QueryOptions<T>): Promise<PaginatedResponse<T>> {
        // const tenantCondition = user.isAdmin ? {} : { tenantId: user.tenantId };
        // const fullWhere = { ...options.where, ...tenantCondition };

        const [items, total] = await this.repository.findAndCount({
            ...options,
            skip: (options.page - 1) * options.limit,
            take: options.limit,
            order: { createdAt: 'DESC' } as any,
        });

        return {
            items,
            total,
            page: options.page,
            limit: options.limit,
            totalPages: Math.ceil(total / options.limit),
        };
    }

    protected async findOne(user: User, options?: FindOneOptions<T>): Promise<T | null> {
        // if (!user.isAdmin && options.where) {
        //     options.where = {
        //         ...options.where,
        //         tenantId: user.tenantId,
        //     } as FindOptionsWhere<T>;
        // }
        const filters = { ...options };
        filters.where = {
            ...options.where,
            tenantId: user.tenantId,
        } as FindOptionsWhere<T>;

        return this.repository.findOne(filters);
    }

    protected async save(user: User, entity: DeepPartial<T>): Promise<T> {
        // if (!user.isAdmin) {
        //     entity.tenantId = user.tenantId;
        // }

        entity.tenantId = user.tenantId;

        return this.repository.save(entity);
    }

    protected async update(user: User, id: number, data: QueryDeepPartialEntity<T>) {
        // if (!user.isAdmin) {
        //   const existing = await this.repository.findOne({ where: { id, tenantId: user.tenantId } as any });
        //   if (!existing) throw new Error('Unauthorized or not found');
        // }

        const existing = await this.repository.findOne({
            where: { id, tenantId: user.tenantId } as any,
        });
        if (!existing) throw new Error('Unauthorized or not found');

        return this.repository.update(id, data);
    }

    protected async delete(user: User, id: number): Promise<void> {
        const entity = await this.repository.findOne({
            where: { id, tenantId: user.tenantId } as any,
        });

        if (!entity) {
            throw new Error('Unauthorized or not found');
        }

        await this.repository.remove(entity);
    }
}
