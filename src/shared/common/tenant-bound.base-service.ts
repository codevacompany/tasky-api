import { DeepPartial, Equal, Repository } from 'typeorm';
import { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity';
import { CustomBadRequestException, CustomNotFoundException } from '../exceptions/http-exception';
import { FindOneQueryOptions, PaginatedResponse, QueryOptions } from '../types/http';
import { AccessProfile } from './access-profile';
import { TenantBoundBaseEntity } from './tenant-bound.base-entity';

export abstract class TenantBoundBaseService<T extends TenantBoundBaseEntity> {
    constructor(protected readonly repository: Repository<T>) {}

    async findMany(
        accessProfile: AccessProfile,
        options: QueryOptions<T>,
    ): Promise<PaginatedResponse<T>> {
        if (options.tenantAware !== false) {
            options.where = {
                ...options.where,
                tenantId: Equal(accessProfile.tenantId),
            };
        }

        const [items, total] = await this.repository.findAndCount({
            ...options,
            skip: options.paginated ? (options.page - 1) * options.limit : undefined,
            take: options.paginated ? options.limit : undefined,
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

    protected async findOne(
        accessProfile: AccessProfile,
        options?: FindOneQueryOptions<T>,
    ): Promise<T | null> {
        if (options.tenantAware !== false) {
            options.where = {
                ...options.where,
                tenantId: Equal(accessProfile.tenantId),
            };
        }

        return this.repository.findOne(options);
    }

    protected async save(
        accessProfile: AccessProfile,
        entity: DeepPartial<T>,
        tenantAware = true,
    ): Promise<T> {
        if (tenantAware) {
            entity.tenantId = accessProfile.tenantId;
        }

        if (!entity.tenantId) {
            throw new CustomBadRequestException({
                code: 'tenant-is-missing',
                message: 'Tenant id is missing',
            });
        }

        return this.repository.save({
            ...entity,
            createdById: accessProfile.userId,
            updatedById: accessProfile.userId,
        });
    }

    protected async update(
        accessProfile: AccessProfile,
        id: number,
        data: QueryDeepPartialEntity<T>,
        tenantAware = true,
    ) {
        const where = { id } as any;

        if (tenantAware) {
            where.tenantId = accessProfile.tenantId;
        }

        const existing = await this.repository.findOne({
            where,
        });

        if (!existing) {
            throw new CustomNotFoundException({
                code: 'not-found',
                message: 'Entity not found.',
            });
        }

        return this.repository.update(id, { ...data, updatedById: accessProfile.userId });
    }

    protected async delete(
        accessProfile: AccessProfile,
        id: number,
        tenantAware = true,
    ): Promise<void> {
        const where = { id } as any;

        if (tenantAware) {
            where.tenantId = accessProfile.tenantId;
        }

        const entity = await this.repository.findOne({ where });

        if (!entity) {
            throw new CustomNotFoundException({
                code: 'not-found',
                message: 'Entity not found.',
            });
        }

        await this.repository.remove(entity);
    }
}
