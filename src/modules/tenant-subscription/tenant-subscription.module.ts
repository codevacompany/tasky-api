import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TenantSubscription } from './entities/tenant-subscription.entity';
import { TenantSubscriptionService } from './tenant-subscription.service';
import { TenantSubscriptionRepository } from './tenant-subscription.repository';
import { BillingService } from './billing.service';
import { SubscriptionPlanModule } from '../subscription-plan/subscription-plan.module';
import { UserModule } from '../user/user.module';
import { RoleModule } from '../role/role.module';
import { PermissionModule } from '../permission/permission.module';
import { TenantModule } from '../tenant/tenant.module';
import { PaymentModule } from '../payment/payment.module';
import { GlobalAdminGuard } from '../../shared/guards/global-admin.guard';
import { StripeModule } from '../../shared/services/stripe/stripe.module';
import { TenantSubscriptionController } from './tenant-subscription.controller';
import { StripeWebhookController } from './stripe-webhook.controller';

@Module({
    imports: [
        TypeOrmModule.forFeature([TenantSubscription]),
        SubscriptionPlanModule,
        RoleModule,
        PermissionModule,
        PaymentModule,
        forwardRef(() => TenantModule),
        forwardRef(() => UserModule),
        StripeModule,
    ],
    controllers: [TenantSubscriptionController, StripeWebhookController],
    providers: [
        TenantSubscriptionService,
        TenantSubscriptionRepository,
        BillingService,
        GlobalAdminGuard,
    ],
    exports: [TenantSubscriptionService, BillingService],
})
export class TenantSubscriptionModule {}
