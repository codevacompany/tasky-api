import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TenantSubscription } from './entities/tenant-subscription.entity';
import { TenantSubscriptionService } from './tenant-subscription.service';
import { TenantSubscriptionRepository } from './tenant-subscription.repository';
import { SubscriptionPlanModule } from '../subscription-plan/subscription-plan.module';
import { UserModule } from '../user/user.module';
import { TenantSubscriptionController } from './tenant-subscription.controller';

@Module({
    imports: [TypeOrmModule.forFeature([TenantSubscription]), SubscriptionPlanModule, UserModule],
    controllers: [TenantSubscriptionController],
    providers: [TenantSubscriptionService, TenantSubscriptionRepository],
    exports: [TenantSubscriptionService],
})
export class TenantSubscriptionModule {}
