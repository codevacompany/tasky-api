import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { SubscriptionPlanService } from './subscription-plan.service';

@Controller('subscription-plans')
@UseGuards(AuthGuard('jwt'))
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
