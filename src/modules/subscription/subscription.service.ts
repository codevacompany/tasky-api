import { Injectable } from '@nestjs/common';
import { AccessProfile } from '../../shared/common/access-profile';
import { TenantBoundBaseService } from '../../shared/common/tenant-bound.base-service';
import {
    CustomBadRequestException,
    CustomNotFoundException,
} from '../../shared/exceptions/http-exception';
import { FindOneQueryOptions, PaginatedResponse, QueryOptions } from '../../shared/types/http';
import { CreateSubscriptionDto } from './dtos/create-subscription.dto';
import { UpdateSubscriptionDto } from './dtos/update-subscription.dto';
import { Subscription, SubscriptionType } from './entities/subscription.entity';
import { SubscriptionRepository } from './subscription.repository';

@Injectable()
export class SubscriptionService extends TenantBoundBaseService<Subscription> {
    constructor(private readonly subscriptionRepository: SubscriptionRepository) {
        super(subscriptionRepository);
    }

    async create(
        accessProfile: AccessProfile,
        createSubscriptionDto: CreateSubscriptionDto,
    ): Promise<Subscription> {
        if (
            accessProfile.roleId !== 1 &&
            (!createSubscriptionDto.tenantId ||
                createSubscriptionDto.tenantId !== accessProfile.tenantId)
        ) {
            createSubscriptionDto.tenantId = accessProfile.tenantId;
        }

        const existingSubscriptions = await this.findMany(accessProfile, {
            where: { tenantId: createSubscriptionDto.tenantId },
            paginated: false,
        });

        const hasActiveSubscription = existingSubscriptions.items.some((subscription) => {
            const now = new Date();
            const isActive =
                !subscription.canceledAt &&
                subscription.startDate <= now &&
                (!subscription.endDate || subscription.endDate > now);

            return isActive;
        });

        if (hasActiveSubscription) {
            throw new CustomBadRequestException({
                code: 'active-subscription-exists',
                message: 'Tenant already has an active subscription',
            });
        }

        return this.save(accessProfile, createSubscriptionDto);
    }

    async findAll(
        accessProfile: AccessProfile,
        filter?: {
            type?: SubscriptionType;
            isActive?: boolean;
        },
        options?: QueryOptions<Subscription>,
    ): Promise<PaginatedResponse<Subscription>> {
        options = options || { page: 1, limit: 10 };

        const result = await super.findMany(accessProfile, {
            ...options,
            where: {
                ...options.where,
                type: filter?.type,
            },
        });

        if (filter?.isActive === undefined) {
            return result;
        }

        result.items.forEach((item) => item.calculateIsActive());

        const filteredItems = result.items.filter((item) => item.isActive === filter.isActive);

        return {
            items: filteredItems,
            total: filteredItems.length,
            page: options.page,
            limit: options.limit,
            totalPages: Math.ceil(filteredItems.length / options.limit),
        };
    }

    async findForTenant(accessProfile: AccessProfile, tenantId?: number): Promise<Subscription[]> {
        const effectiveTenantId =
            accessProfile.roleId === 1
                ? tenantId || accessProfile.tenantId
                : accessProfile.tenantId;

        const result = await super.findMany(accessProfile, {
            where: { tenantId: effectiveTenantId },
            order: { createdAt: 'DESC' },
        });

        return result.items;
    }

    async findOne(
        accessProfile: AccessProfile,
        options: FindOneQueryOptions<Subscription> | number,
    ): Promise<Subscription> {
        let queryOptions: FindOneQueryOptions<Subscription>;

        if (typeof options === 'number') {
            queryOptions = { where: { id: options } };
        } else {
            queryOptions = options;
        }

        const subscription = await super.findOne(accessProfile, queryOptions);

        if (!subscription) {
            throw new CustomNotFoundException({
                code: 'subscription-not-found',
                message: 'Subscription not found',
            });
        }

        return subscription;
    }

    async findActiveSubscription(
        accessProfile: AccessProfile,
        tenantId?: number,
    ): Promise<Subscription | null> {
        const effectiveTenantId =
            accessProfile.roleId === 1
                ? tenantId || accessProfile.tenantId
                : accessProfile.tenantId;

        const subscriptions = await this.findForTenant(accessProfile, effectiveTenantId);

        const now = new Date();
        return (
            subscriptions.find((subscription) => {
                return (
                    !subscription.canceledAt &&
                    subscription.startDate <= now &&
                    (!subscription.endDate || subscription.endDate > now)
                );
            }) || null
        );
    }

    async createRenewal(
        accessProfile: AccessProfile,
        tenantId: number,
        type: SubscriptionType = SubscriptionType.MONTHLY,
    ): Promise<Subscription> {
        // Find current subscription to determine renewal timing
        const currentSubscription = await this.findActiveSubscription(accessProfile, tenantId);

        let startDate: Date;

        if (currentSubscription && currentSubscription.endDate) {
            // Start the new subscription right after the current one ends
            startDate = new Date(currentSubscription.endDate);
        } else {
            // Start immediately if no active subscription or no end date
            startDate = new Date();
        }

        // Calculate end date based on type
        const endDate = new Date(startDate);
        switch (type) {
            case SubscriptionType.MONTHLY:
                endDate.setMonth(endDate.getMonth() + 1);
                break;
            case SubscriptionType.YEARLY:
                endDate.setFullYear(endDate.getFullYear() + 1);
                break;
            case SubscriptionType.TRIAL:
                endDate.setDate(endDate.getDate() + 14); // 14 day trial
                break;
            default:
                endDate.setMonth(endDate.getMonth() + 1); // Default to monthly
        }

        // Create the renewal
        return this.create(accessProfile, {
            tenantId,
            startDate,
            endDate,
            type,
        });
    }

    async updateSubscription(
        accessProfile: AccessProfile,
        id: number,
        updateSubscriptionDto: UpdateSubscriptionDto,
    ): Promise<Subscription> {
        await super.update(accessProfile, id, updateSubscriptionDto);
        return this.findOne(accessProfile, id);
    }

    async cancel(accessProfile: AccessProfile, id: number): Promise<Subscription> {
        const subscription = await this.findOne(accessProfile, id);

        if (subscription.canceledAt) {
            throw new CustomBadRequestException({
                code: 'subscription-already-canceled',
                message: 'This subscription has already been canceled',
            });
        }

        await super.update(accessProfile, id, {
            canceledAt: new Date(),
        });

        return this.findOne(accessProfile, id);
    }

    async remove(accessProfile: AccessProfile, id: number): Promise<void> {
        await this.findOne(accessProfile, id);
        await super.delete(accessProfile, id);
    }
}
