import { Body, Controller, Get, Param, ParseIntPipe, Post, UseGuards, Query } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AccessProfile, GetAccessProfile } from '../../shared/common/access-profile';
import { GlobalAdminGuard } from '../../shared/guards/global-admin.guard';
import { TenantAdminGuard } from '../../shared/guards/tenant-admin.guard';
import { TenantSubscriptionService } from './tenant-subscription.service';
import { BillingService } from './billing.service';

@Controller('tenant-subscriptions')
@UseGuards(AuthGuard('jwt'))
export class TenantSubscriptionController {
    constructor(
        private readonly tenantSubscriptionService: TenantSubscriptionService,
        private readonly billingService: BillingService,
    ) {}

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

    // Billing endpoints
    @Get('tenant/:tenantId/billing')
    @UseGuards(TenantAdminGuard)
    getTenantBilling(
        @Param('tenantId', ParseIntPipe) tenantId: number,
        @GetAccessProfile() accessProfile: AccessProfile,
    ) {
        return this.billingService.calculateTenantBilling(tenantId);
    }

    @Get('tenant/:tenantId/billing/summary')
    @UseGuards(TenantAdminGuard)
    getBillingSummary(
        @Param('tenantId', ParseIntPipe) tenantId: number,
        @GetAccessProfile() accessProfile: AccessProfile,
    ) {
        return this.billingService.getBillingSummary(tenantId);
    }

    @Post('tenant/:tenantId/billing/validate-user-addition')
    @UseGuards(TenantAdminGuard)
    validateUserAddition(
        @Param('tenantId', ParseIntPipe) tenantId: number,
        @GetAccessProfile() accessProfile: AccessProfile,
        @Body() body: { usersToAdd?: number },
    ) {
        return this.billingService.validateUserAddition(tenantId, body.usersToAdd || 1);
    }

    @Post('tenant/:tenantId/billing/create-payment')
    @UseGuards(TenantAdminGuard)
    createBillingPayment(
        @Param('tenantId', ParseIntPipe) tenantId: number,
        @GetAccessProfile() accessProfile: AccessProfile,
        @Body() body: { dueDate?: string },
    ) {
        const dueDate = body.dueDate ? new Date(body.dueDate) : undefined;
        return this.billingService.createBillingPayment(tenantId, dueDate);
    }

    @Get('tenant/:tenantId/billing/report')
    @UseGuards(TenantAdminGuard)
    generateBillingReport(
        @Param('tenantId', ParseIntPipe) tenantId: number,
        @GetAccessProfile() accessProfile: AccessProfile,
        @Query('fromDate') fromDate?: string,
        @Query('toDate') toDate?: string,
    ) {
        const from = fromDate ? new Date(fromDate) : undefined;
        const to = toDate ? new Date(toDate) : undefined;
        return this.billingService.generateBillingReport(tenantId, from, to);
    }

    @Post('subscribe')
    @UseGuards(TenantAdminGuard)
    async subscribe(
        @Body() body: { planSlug: string },
        @GetAccessProfile() accessProfile: AccessProfile,
    ) {
        return this.tenantSubscriptionService.activateSubscription(
            accessProfile.tenantId,
            body.planSlug,
        );
    }

    @Post('tenant/:tenantId/trial')
    @UseGuards(GlobalAdminGuard)
    createTrialSubscription(
        @Param('tenantId', ParseIntPipe) tenantId: number,
        @GetAccessProfile() accessProfile: AccessProfile,
        @Body() body: { planSlug?: string },
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
