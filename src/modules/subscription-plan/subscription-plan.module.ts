import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SubscriptionPlan } from './entities/subscription-plan.entity';
import { SubscriptionPlanPermission } from './entities/subscription-plan-permission.entity';
import { SubscriptionPlanService } from './subscription-plan.service';
import { SubscriptionPlanRepository } from './subscription-plan.repository';

@Module({
    imports: [TypeOrmModule.forFeature([SubscriptionPlan, SubscriptionPlanPermission])],
    providers: [SubscriptionPlanService, SubscriptionPlanRepository],
    exports: [SubscriptionPlanService],
})
export class SubscriptionPlanModule {}
