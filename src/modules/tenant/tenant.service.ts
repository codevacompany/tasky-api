import { Injectable } from '@nestjs/common';
import { ILike } from 'typeorm';
import { CustomConflictException } from '../../shared/exceptions/http-exception';
import { PaginatedResponse, QueryOptions } from '../../shared/types/http';
import { CreateTenantDto } from './dtos/create-tenant.dto';
import { UpdateTenantDto } from './dtos/update-tenant.dto';
import { Tenant } from './entities/tenant.entity';
import { TenantRepository } from './tenant.repository';

@Injectable()
export class TenantService {
    constructor(private tenantRepository: TenantRepository) {}

    async findAll(
        where?: { name: string },
        options?: QueryOptions<Tenant>,
    ): Promise<PaginatedResponse<Tenant>> {
        const query = this.buildQuery(where);

        const [items, total] = await this.tenantRepository.findAndCount({
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

    async findByName(name: string): Promise<Tenant> {
        return await this.tenantRepository.findOne({
            where: {
                name,
            },
        });
    }

    async create(Tenant: CreateTenantDto) {
        const TenantExists = await this.tenantRepository.findOne({
            where: {
                name: Tenant.name,
            },
        });

        if (TenantExists) {
            throw new CustomConflictException({
                code: 'name-already-registered',
                message: 'This name is already registered',
            });
        }

        return await this.tenantRepository.save(Tenant);
    }

    async update(id: number, Tenant: UpdateTenantDto) {
        await this.tenantRepository.update(id, Tenant);

        return {
            message: 'Successfully updated!',
            TenantId: id,
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
