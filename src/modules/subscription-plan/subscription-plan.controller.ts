import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { SubscriptionPlanService } from './subscription-plan.service';

@Controller('subscription-plans')
@UseGuards(JwtAuthGuard)
export class SubscriptionPlanController {
    constructor(private readonly subscriptionPlanService: SubscriptionPlanService) {}

    @Get()
    async findAll() {
        return this.subscriptionPlanService.findAll();
    }

    @Get(':slug')
    async findBySlug(@Param('slug') slug: string) {
        return this.subscriptionPlanService.findBySlug(slug);
    }

    @Get(':id/permissions')
    async getPermissionsByPlanId(@Param('id') planId: number) {
        return this.subscriptionPlanService.getPermissionsByPlanId(planId);
    }
}
