import { Body, Controller, Get, Param, ParseIntPipe, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AccessProfile, GetAccessProfile } from '../../shared/common/access-profile';
import { GlobalAdminGuard } from '../../shared/guards/global-admin.guard';
import { TenantSubscriptionService } from './tenant-subscription.service';

@Controller('tenant-subscriptions')
@UseGuards(AuthGuard('jwt'))
export class TenantSubscriptionController {
    constructor(private readonly tenantSubscriptionService: TenantSubscriptionService) {}

    @Get('tenant/:tenantId/summary')
    getSubscriptionSummary(
        @Param('tenantId', ParseIntPipe) tenantId: number,
        @GetAccessProfile() accessProfile: AccessProfile,
    ) {
        return this.tenantSubscriptionService.getSubscriptionSummary(tenantId);
    }

    @Get('tenant/:tenantId/active')
    findActiveTenantSubscription(
        @Param('tenantId', ParseIntPipe) tenantId: number,
        @GetAccessProfile() accessProfile: AccessProfile,
    ) {
        return this.tenantSubscriptionService.findActiveTenantSubscription(tenantId);
    }

    @Get('tenant/:tenantId/current')
    findCurrentTenantSubscription(
        @Param('tenantId', ParseIntPipe) tenantId: number,
        @GetAccessProfile() accessProfile: AccessProfile,
    ) {
        return this.tenantSubscriptionService.findCurrentTenantSubscription(tenantId);
    }

    @Get('tenant/:tenantId/permissions')
    getTenantPermissions(
        @Param('tenantId', ParseIntPipe) tenantId: number,
        @GetAccessProfile() accessProfile: AccessProfile,
    ) {
        return this.tenantSubscriptionService.getTenantPermissions(tenantId);
    }

    @Get('tenant/:tenantId/user-limit')
    validateUserLimit(
        @Param('tenantId', ParseIntPipe) tenantId: number,
        @GetAccessProfile() accessProfile: AccessProfile,
    ) {
        return this.tenantSubscriptionService.validateUserLimit(tenantId);
    }

    @Post('tenant/:tenantId/trial')
    @UseGuards(GlobalAdminGuard)
    createTrialSubscription(
        @Param('tenantId', ParseIntPipe) tenantId: number,
        @Body() body: { planSlug?: string },
        @GetAccessProfile() accessProfile: AccessProfile,
    ) {
        const planSlug = body.planSlug || 'iniciante';
        return this.tenantSubscriptionService.createTrialSubscription(tenantId, planSlug);
    }

    @Post('tenant/:tenantId/activate')
    @UseGuards(GlobalAdminGuard)
    activateSubscription(
        @Param('tenantId', ParseIntPipe) tenantId: number,
        @Body() body: { planSlug: string },
        @GetAccessProfile() accessProfile: AccessProfile,
    ) {
        return this.tenantSubscriptionService.activateSubscription(tenantId, body.planSlug);
    }
}
