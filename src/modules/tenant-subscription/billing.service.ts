import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { TenantSubscriptionService } from './tenant-subscription.service';
import { SubscriptionPlanService } from '../subscription-plan/subscription-plan.service';
import { UserService } from '../user/user.service';
import { PaymentService } from '../payment/payment.service';

export interface BillingCalculation {
    basePlanCost: number;
    additionalUsersCost: number;
    totalCost: number;
    basePlanUsers: number;
    additionalUsers: number;
    totalUsers: number;
    planName: string;
    planSlug: string;
    description: string;
}

@Injectable()
export class BillingService {
    constructor(
        @Inject(forwardRef(() => TenantSubscriptionService))
        private tenantSubscriptionService: TenantSubscriptionService,
        private subscriptionPlanService: SubscriptionPlanService,
        @Inject(forwardRef(() => UserService))
        private userService: UserService,
        @Inject(forwardRef(() => PaymentService))
        private paymentService: PaymentService,
    ) {}

    /**
     * Calculate the billing amount for a tenant based on their subscription and user count
     * For Plano Profissional: R$ 399 base + R$ 15 per additional user beyond 30 users
     */
    async calculateTenantBilling(tenantId: number): Promise<BillingCalculation> {
        const subscription = await this.tenantSubscriptionService.findCurrentTenantSubscription(tenantId);
        const currentUsers = await this.tenantSubscriptionService.getCurrentUserCount(tenantId);

        if (!subscription || !subscription.subscriptionPlan) {
            throw new Error('No active subscription found for tenant');
        }

        const plan = subscription.subscriptionPlan;
        const basePlanCost = Number(plan.priceMonthly);
        let additionalUsersCost = 0;
        let additionalUsers = 0;
        let description = `${plan.name}`;

        // For Plano Profissional (30 users max), calculate additional user costs
        if (plan.slug === 'profissional' && plan.maxUsers && currentUsers > plan.maxUsers) {
            additionalUsers = currentUsers - plan.maxUsers;
            const additionalPlan = await this.subscriptionPlanService.findBySlug('adicional');

            if (additionalPlan) {
                const additionalUserRate = Number(additionalPlan.priceMonthly); // R$ 15 per user
                additionalUsersCost = additionalUsers * additionalUserRate;
                description = `${plan.name} + ${additionalUsers} usuário${additionalUsers > 1 ? 's' : ''} adicional${additionalUsers > 1 ? 'is' : ''}`;
            }
        }

        // For other plans that exceed their limits (but aren't profissional)
        else if (plan.maxUsers && currentUsers > plan.maxUsers && plan.slug !== 'adicional') {
            // This shouldn't happen normally, but we handle it for completeness
            additionalUsers = currentUsers - plan.maxUsers;
            const additionalPlan = await this.subscriptionPlanService.findBySlug('adicional');

            if (additionalPlan) {
                const additionalUserRate = Number(additionalPlan.priceMonthly);
                additionalUsersCost = additionalUsers * additionalUserRate;
                description = `${plan.name} + ${additionalUsers} usuário${additionalUsers > 1 ? 's' : ''} adicional${additionalUsers > 1 ? 'is' : ''}`;
            }
        }

        const totalCost = basePlanCost + additionalUsersCost;

        return {
            basePlanCost,
            additionalUsersCost,
            totalCost,
            basePlanUsers: plan.maxUsers || 0,
            additionalUsers,
            totalUsers: currentUsers,
            planName: plan.name,
            planSlug: plan.slug,
            description,
        };
    }

    /**
     * Create a payment for the calculated billing amount
     */
    async createBillingPayment(tenantId: number, dueDate?: Date): Promise<any> {
        const billing = await this.calculateTenantBilling(tenantId);
        const subscription = await this.tenantSubscriptionService.findCurrentTenantSubscription(tenantId);

        if (!subscription) {
            throw new Error('No active subscription found for tenant');
        }

        const paymentDueDate = dueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // Default: 30 days from now

        return this.paymentService.createPayment({
            tenantId,
            tenantSubscriptionId: subscription.id,
            amount: billing.totalCost,
            dueDate: paymentDueDate,
            description: billing.description,
        });
    }

    /**
     * Get billing summary for a tenant including current period calculation
     */
    async getBillingSummary(tenantId: number): Promise<{
        currentBilling: BillingCalculation;
        nextBillingDate: Date | null;
        pendingPayments: any[];
        overduePayments: any[];
    }> {
        const currentBilling = await this.calculateTenantBilling(tenantId);
        const subscription = await this.tenantSubscriptionService.findCurrentTenantSubscription(tenantId);

        let nextBillingDate: Date | null = null;
        if (subscription && subscription.status === 'active') {
            // Calculate next billing date (assuming monthly billing)
            nextBillingDate = new Date(subscription.startDate);
            nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);

            // If that date has passed, calculate the next one
            while (nextBillingDate <= new Date()) {
                nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);
            }
        }

        const [pendingPayments, overduePayments] = await Promise.all([
            this.paymentService.findPendingPayments(tenantId),
            this.paymentService.findOverduePayments(tenantId),
        ]);

        return {
            currentBilling,
            nextBillingDate,
            pendingPayments,
            overduePayments,
        };
    }

    /**
     * Validate if a tenant can add more users based on their billing limits
     */
    async validateUserAddition(tenantId: number, usersToAdd: number = 1): Promise<{
        canAdd: boolean;
        reason?: string;
        additionalCost?: number;
        newTotalCost?: number;
    }> {
        const currentBilling = await this.calculateTenantBilling(tenantId);
        const subscription = await this.tenantSubscriptionService.findCurrentTenantSubscription(tenantId);

        if (!subscription || !subscription.subscriptionPlan) {
            return {
                canAdd: false,
                reason: 'No active subscription found',
            };
        }

        const plan = subscription.subscriptionPlan;

        // For unlimited plans (adicional), allow any number of users
        if (!plan.maxUsers) {
            return {
                canAdd: true,
                additionalCost: usersToAdd * Number(plan.priceMonthly),
                newTotalCost: currentBilling.totalCost + (usersToAdd * Number(plan.priceMonthly)),
            };
        }

        // For limited plans, calculate additional cost if exceeding limit
        const newTotalUsers = currentBilling.totalUsers + usersToAdd;

        if (newTotalUsers <= plan.maxUsers) {
            // Still within plan limits, no additional cost
            return {
                canAdd: true,
                additionalCost: 0,
                newTotalCost: currentBilling.totalCost,
            };
        }

        // Exceeding plan limits, calculate additional user cost
        const usersOverLimit = newTotalUsers - plan.maxUsers;
        const currentUsersOverLimit = Math.max(0, currentBilling.totalUsers - plan.maxUsers);
        const additionalUsersToCharge = usersOverLimit - currentUsersOverLimit;

        const additionalPlan = await this.subscriptionPlanService.findBySlug('adicional');
        if (!additionalPlan) {
            return {
                canAdd: false,
                reason: 'Additional user pricing not configured',
            };
        }

        const additionalCost = additionalUsersToCharge * Number(additionalPlan.priceMonthly);
        const newTotalCost = currentBilling.totalCost + additionalCost;

        return {
            canAdd: true,
            additionalCost,
            newTotalCost,
        };
    }

    /**
     * Generate a billing report for a tenant
     */
    async generateBillingReport(tenantId: number, fromDate?: Date, toDate?: Date): Promise<{
        tenant: any;
        period: { from: Date; to: Date };
        currentBilling: BillingCalculation;
        paymentHistory: any[];
        totalPaidAmount: number;
        totalPendingAmount: number;
    }> {
        const now = new Date();
        const from = fromDate || new Date(now.getFullYear(), now.getMonth() - 3, 1); // Last 3 months
        const to = toDate || now;

        const [currentBilling, paymentHistory] = await Promise.all([
            this.calculateTenantBilling(tenantId),
            this.paymentService.getPaymentHistory(tenantId),
        ]);

        // Filter payments by date range
        const filteredPayments = paymentHistory.filter(payment => {
            const paymentDate = new Date(payment.createdAt);
            return paymentDate >= from && paymentDate <= to;
        });

        const totalPaidAmount = filteredPayments
            .filter(p => p.status === 'completed')
            .reduce((sum, p) => sum + Number(p.amount), 0);

        const totalPendingAmount = filteredPayments
            .filter(p => p.status === 'pending')
            .reduce((sum, p) => sum + Number(p.amount), 0);

        // Get tenant info (this would need to be implemented)
        const tenant = { id: tenantId }; // Placeholder

        return {
            tenant,
            period: { from, to },
            currentBilling,
            paymentHistory: filteredPayments,
            totalPaidAmount,
            totalPendingAmount,
        };
    }
}
