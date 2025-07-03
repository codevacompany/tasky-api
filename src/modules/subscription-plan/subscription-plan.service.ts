import { Injectable } from '@nestjs/common';
import { SubscriptionPlanRepository } from './subscription-plan.repository';

@Injectable()
export class SubscriptionPlanService {
    constructor(private subscriptionPlanRepository: SubscriptionPlanRepository) {}

    async findAll() {
        return this.subscriptionPlanRepository.find({
            where: { isActive: true },
            order: { priceMonthly: 'ASC' },
        });
    }

    async findBySlug(slug: string) {
        return this.subscriptionPlanRepository.findOne({
            where: { slug, isActive: true },
        });
    }

    async findWithPermissions(planId: number) {
        return this.subscriptionPlanRepository.findOne({
            where: { id: planId, isActive: true },
            relations: ['subscriptionPlanPermissions', 'subscriptionPlanPermissions.permission'],
        });
    }

    async getPermissionsByPlanId(planId: number): Promise<string[]> {
        const plan = await this.subscriptionPlanRepository
            .createQueryBuilder('plan')
            .leftJoinAndSelect('plan.subscriptionPlanPermissions', 'spp')
            .leftJoinAndSelect('spp.permission', 'permission')
            .where('plan.id = :planId', { planId })
            .andWhere('plan.isActive = true')
            .andWhere('permission.isActive = true')
            .getOne();

        if (!plan) {
            return [];
        }

        return plan.subscriptionPlanPermissions.map((spp) => spp.permission.key);
    }
}
