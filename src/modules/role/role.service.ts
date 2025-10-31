import { Injectable } from '@nestjs/common';
import { ILike, Not } from 'typeorm';
import { PaginatedResponse, QueryOptions } from '../../shared/types/http';
import { Role } from './entities/role.entity';
import { RoleRepository } from './role.repository';
import { RoleName } from './entities/role.entity';

@Injectable()
export class RoleService {
    constructor(private roleRepository: RoleRepository) {}

    async findAll(
        where?: { name: string },
        options?: QueryOptions<Role>,
    ): Promise<PaginatedResponse<Role>> {
        const query = this.buildQuery(where);

        const [items, total] = await this.roleRepository.findAndCount({
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

    async findByName(name: string): Promise<Role> {
        return await this.roleRepository.findOne({
            where: {
                name,
            },
        });
    }

    async findById(id: number): Promise<Role | null> {
        return await this.roleRepository.findOne({ where: { id } as any });
    }

    async findAssignable(options?: QueryOptions<Role>): Promise<PaginatedResponse<Role>> {
        const page = options?.page ?? 1;
        const limit = options?.limit ?? 50;

        const [items, total] = await this.roleRepository.findAndCount({
            where: { name: Not(RoleName.GlobalAdmin) },
            skip: (page - 1) * limit,
            take: limit,
        });

        return {
            items,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
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
