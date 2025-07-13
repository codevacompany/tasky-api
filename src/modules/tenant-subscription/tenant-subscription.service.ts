import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { TenantSubscriptionRepository } from './tenant-subscription.repository';
import { SubscriptionPlanService } from '../subscription-plan/subscription-plan.service';
import { UserService } from '../user/user.service';
import { PermissionService } from '../permission/permission.service';
import { TenantService } from '../tenant/tenant.service';
import { SubscriptionStatus } from './entities/tenant-subscription.entity';

@Injectable()
export class TenantSubscriptionService {
    constructor(
        private tenantSubscriptionRepository: TenantSubscriptionRepository,
        private subscriptionPlanService: SubscriptionPlanService,
        @Inject(forwardRef(() => UserService))
        private userService: UserService,
        private permissionService: PermissionService,
        @Inject(forwardRef(() => TenantService))
        private tenantService: TenantService,
    ) {}

    async findActiveTenantSubscription(tenantId: number) {
        return this.tenantSubscriptionRepository.findOne({
            where: {
                tenantId,
                status: SubscriptionStatus.ACTIVE,
            },
            relations: ['subscriptionPlan'],
            order: { createdAt: 'DESC' },
        });
    }

    async findCurrentTenantSubscription(tenantId: number) {
        // First try to find active subscription
        let subscription = await this.findActiveTenantSubscription(tenantId);

        // If no active subscription, try to find trial
        if (!subscription) {
            subscription = await this.tenantSubscriptionRepository.findOne({
                where: {
                    tenantId,
                    status: SubscriptionStatus.TRIAL,
                },
                relations: ['subscriptionPlan'],
                order: { createdAt: 'DESC' },
            });
        }

        return subscription;
    }

    async getTenantPermissions(tenantId: number): Promise<string[]> {
        const tenant = await this.tenantService.findById(tenantId);

        if (tenant.isInternal) {
            const allPermissions = await this.permissionService.findAll();
            return allPermissions
                .filter((permission) => permission.isActive)
                .map((permission) => permission.key);
        }

        const subscription = await this.findCurrentTenantSubscription(tenantId);

        if (!subscription || !subscription.subscriptionPlan) {
            return [];
        }

        return this.subscriptionPlanService.getPermissionsByPlanId(
            subscription.subscriptionPlan.id,
        );
    }

    async getCurrentUserCount(tenantId: number): Promise<number> {
        return this.userService.getActiveUserCount(tenantId);
    }

    async createTrialSubscription(tenantId: number, planSlug: string = 'profissional') {
        const plan = await this.subscriptionPlanService.findBySlug(planSlug);
        if (!plan) {
            throw new Error('Subscription plan not found');
        }

        const trialEndDate = new Date();
        trialEndDate.setDate(trialEndDate.getDate() + 30); // 30 days trial

        const subscription = this.tenantSubscriptionRepository.create({
            tenantId,
            subscriptionPlanId: plan.id,
            startDate: new Date(),
            trialEndDate,
            status: SubscriptionStatus.TRIAL,
        });

        return this.tenantSubscriptionRepository.save(subscription);
    }

    async activateSubscription(tenantId: number, planSlug: string) {
        const plan = await this.subscriptionPlanService.findBySlug(planSlug);
        if (!plan) {
            throw new Error('Subscription plan not found');
        }

        await this.tenantSubscriptionRepository.update({ tenantId }, { cancelledAt: new Date() });

        const subscription = this.tenantSubscriptionRepository.create({
            tenantId,
            subscriptionPlanId: plan.id,
            startDate: new Date(),
            status: SubscriptionStatus.ACTIVE,
        });

        return this.tenantSubscriptionRepository.save(subscription);
    }

    async validateUserLimit(
        tenantId: number,
    ): Promise<{ isValid: boolean; currentUsers: number; maxUsers: number | null }> {
        const subscription = await this.findCurrentTenantSubscription(tenantId);
        const currentUsers = await this.getCurrentUserCount(tenantId);

        if (!subscription || !subscription.subscriptionPlan) {
            return { isValid: false, currentUsers, maxUsers: 0 };
        }

        const maxUsers = subscription.subscriptionPlan.maxUsers;

        if (maxUsers === null) {
            return { isValid: true, currentUsers, maxUsers };
        }

        return {
            isValid: currentUsers <= maxUsers,
            currentUsers,
            maxUsers,
        };
    }

    async getSubscriptionSummary(tenantId: number) {
        const subscription = await this.findCurrentTenantSubscription(tenantId);
        const userStats = await this.userService.getUserStatistics(tenantId);

        if (!subscription) {
            return {
                hasSubscription: false,
                userStats,
            };
        }

        const validation = await this.validateUserLimit(tenantId);

        // Calculate billing information for active subscriptions
        let billingInfo = null;
        if (subscription.status === SubscriptionStatus.ACTIVE) {
            try {
                const currentUsers = await this.getCurrentUserCount(tenantId);
                const plan = subscription.subscriptionPlan;
                const basePlanCost = Number(plan.priceMonthly);
                let additionalUsersCost = 0;
                let additionalUsers = 0;
                let totalCost = basePlanCost;

                // Calculate additional user costs if exceeding plan limits
                if (plan.maxUsers && currentUsers > plan.maxUsers) {
                    additionalUsers = currentUsers - plan.maxUsers;
                    const additionalPlan =
                        await this.subscriptionPlanService.findBySlug('adicional');

                    if (additionalPlan) {
                        const additionalUserRate = Number(additionalPlan.priceMonthly); // R$ 15 per user
                        additionalUsersCost = additionalUsers * additionalUserRate;
                        totalCost = basePlanCost + additionalUsersCost;
                    }
                }

                billingInfo = {
                    basePlanCost,
                    additionalUsersCost,
                    totalCost,
                    additionalUsers,
                    currentUsers,
                    exceedsLimit: currentUsers > (plan.maxUsers || Infinity),
                };
            } catch (error) {
                console.error('Error calculating billing info:', error);
                // Continue without billing info if calculation fails
            }
        }

        return {
            hasSubscription: true,
            subscription: {
                id: subscription.id,
                status: subscription.status,
                planName: subscription.subscriptionPlan?.name,
                planSlug: subscription.subscriptionPlan?.slug,
                maxUsers: subscription.subscriptionPlan?.maxUsers,
                startDate: subscription.startDate,
                endDate: subscription.endDate,
                trialEndDate: subscription.trialEndDate,
                isActive: subscription.isActive,
            },
            userStats,
            validation,
            billing: billingInfo,
        };
    }
}
