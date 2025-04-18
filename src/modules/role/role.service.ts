import { Injectable } from '@nestjs/common';
import { ILike } from 'typeorm';
import { PaginatedResponse, QueryOptions } from '../../shared/types/http';
import { Role } from './entities/role.entity';
import { RoleRepository } from './role.repository';

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

    private buildQuery(where: { name: string }) {
        const queryWhere: any = { ...where };

        if (where.name) {
            queryWhere.name = ILike(`%${where.name}%`);
        }

        return { where: queryWhere };
    }
}
