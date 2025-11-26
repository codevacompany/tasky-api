import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Inject, forwardRef } from '@nestjs/common';
import { UserService } from '../../modules/user/user.service';
import { TenantService } from '../../modules/tenant/tenant.service';
import { TenantSubscriptionService } from '../../modules/tenant-subscription/tenant-subscription.service';
import { SubscriptionStatus } from '../../modules/tenant-subscription/entities/tenant-subscription.entity';
import { AccessProfile } from '../common/access-profile';
import {
    CustomForbiddenException,
    CustomUnauthorizedException,
} from '../exceptions/http-exception';

@Injectable()
export class SubscriptionRequiredGuard implements CanActivate {
    constructor(
        @Inject(forwardRef(() => UserService))
        private readonly userService: UserService,
        @Inject(forwardRef(() => TenantService))
        private readonly tenantService: TenantService,
        @Inject(forwardRef(() => TenantSubscriptionService))
        private readonly tenantSubscriptionService: TenantSubscriptionService,
    ) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest();
        const accessProfile = request.user as AccessProfile;

        if (!accessProfile) {
            throw new CustomUnauthorizedException({
                code: 'unauthorized-user',
                message: 'User not authenticated',
            });
        }

        const user = await this.userService.findById(accessProfile.userId);

        if (!user) {
            throw new CustomUnauthorizedException({
                code: 'user-not-found',
                message: 'User not found',
            });
        }

        const tenant = await this.tenantService.findById(user.tenantId);

        if (!tenant) {
            throw new CustomUnauthorizedException({
                code: 'tenant-not-found',
                message: 'Tenant not found',
            });
        }

        if (tenant.isInternal) {
            return true;
        }

        const subscription = await this.tenantSubscriptionService.findCurrentTenantSubscription(
            user.tenantId,
        );

        const hasActiveSubscription =
            subscription &&
            (subscription.status === SubscriptionStatus.ACTIVE ||
                (subscription.status === SubscriptionStatus.TRIAL &&
                    subscription.trialEndDate &&
                    subscription.trialEndDate > new Date()));

        if (!hasActiveSubscription) {
            throw new CustomForbiddenException({
                code: 'subscription-required',
                message: 'An active subscription is required to access this resource',
            });
        }

        return true;
    }
}
