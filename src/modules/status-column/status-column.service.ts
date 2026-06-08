import { Injectable } from '@nestjs/common';
import { AccessProfile } from '../../shared/common/access-profile';
import { TenantBoundBaseService } from '../../shared/common/tenant-bound.base-service';
import { QueryOptions } from '../../shared/types/http';
import { StatusColumnRepository } from './status-column.repository';
import { StatusColumn } from './entities/status-column.entity';

@Injectable()
export class StatusColumnService extends TenantBoundBaseService<StatusColumn> {
    constructor(private statusColumnRepository: StatusColumnRepository) {
        super(statusColumnRepository);
    }

    async findMany(accessProfile: AccessProfile, options?: QueryOptions<StatusColumn>) {
        const qb = this.statusColumnRepository
            .createQueryBuilder('statusColumn')
            .leftJoinAndSelect('statusColumn.statuses', 'statuses')
            .where('statusColumn.tenantId = :tenantId', { tenantId: accessProfile.tenantId })
            .andWhere('statusColumn.isActive = :isActive', { isActive: true })
            .orderBy('statusColumn.index', 'ASC');

        const [items, total] = await qb.getManyAndCount();

        return {
            items,
            total,
            page: options?.page || 1,
            limit: options?.limit || total,
            totalPages: options?.limit ? Math.ceil(total / options.limit) : 1,
        };
    }
}
