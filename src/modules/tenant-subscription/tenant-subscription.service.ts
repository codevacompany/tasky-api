import { Injectable, Inject, forwardRef, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TenantSubscriptionRepository } from './tenant-subscription.repository';
import { SubscriptionPlanService } from '../subscription-plan/subscription-plan.service';
import { UserService } from '../user/user.service';
import { PermissionService } from '../permission/permission.service';
import { TenantService } from '../tenant/tenant.service';
import { SubscriptionStatus } from './entities/tenant-subscription.entity';
import {
    CustomBadRequestException,
    CustomNotFoundException,
} from '../../shared/exceptions/http-exception';
import { StripeService, StripeBillingInterval } from '../../shared/services/stripe/stripe.service';
import { PaymentService } from '../payment/payment.service';
import { PaymentMethod, PaymentStatus } from '../payment/entities/payment.entity';
import Stripe from 'stripe';

export interface ActivateSubscriptionOptions {
    billingInterval?: StripeBillingInterval;
    collectionMethod?: Stripe.SubscriptionCreateParams.CollectionMethod;
}

@Injectable()
export class TenantSubscriptionService {
    private readonly logger = new Logger(TenantSubscriptionService.name);

    constructor(
        private tenantSubscriptionRepository: TenantSubscriptionRepository,
        private subscriptionPlanService: SubscriptionPlanService,
        @Inject(forwardRef(() => UserService))
        private userService: UserService,
        private permissionService: PermissionService,
        @Inject(forwardRef(() => TenantService))
        private tenantService: TenantService,
        private stripeService: StripeService,
        private configService: ConfigService,
        private paymentService: PaymentService,
    ) {}

    async findActiveTenantSubscription(tenantId: number) {
        return this.tenantSubscriptionRepository.findOne({
            where: {
                tenantId,
                status: SubscriptionStatus.ACTIVE,
            },
            relations: ['subscriptionPlan'],
            order: { createdAt: 'DESC' },
        });
    }

    async findByStripeSubscriptionId(stripeSubscriptionId: string) {
        return this.tenantSubscriptionRepository.findOne({
            where: { stripeSubscriptionId },
        });
    }

    async findCurrentTenantSubscription(tenantId: number) {
        // First try to find active subscription
        let subscription = await this.findActiveTenantSubscription(tenantId);

        // If no active subscription, try to find trial
        if (!subscription) {
            subscription = await this.tenantSubscriptionRepository.findOne({
                where: {
                    tenantId,
                    status: SubscriptionStatus.TRIAL,
                },
                relations: ['subscriptionPlan'],
                order: { createdAt: 'DESC' },
            });
        }

        return subscription;
    }

    async getTenantPermissions(tenantId: number): Promise<string[]> {
        const tenant = await this.tenantService.findById(tenantId);

        if (tenant.isInternal) {
            const allPermissions = await this.permissionService.findAll();
            return allPermissions
                .filter((permission) => permission.isActive)
                .map((permission) => permission.key);
        }

        const subscription = await this.findCurrentTenantSubscription(tenantId);

        if (!subscription || !subscription.subscriptionPlan || !subscription.isActive) {
            return [];
        }

        return this.subscriptionPlanService.getPermissionsByPlanId(
            subscription.subscriptionPlan.id,
        );
    }

    async getCurrentUserCount(tenantId: number): Promise<number> {
        return this.userService.getActiveUserCount(tenantId);
    }

    async createTrialSubscription(tenantId: number, planSlug: string = 'avancado') {
        const plan = await this.subscriptionPlanService.findBySlug(planSlug);
        if (!plan) {
            throw new Error('Subscription plan not found');
        }

        const trialEndDate = new Date();
        trialEndDate.setDate(trialEndDate.getDate() + 30); // 30 days trial

        const subscription = this.tenantSubscriptionRepository.create({
            tenantId,
            subscriptionPlanId: plan.id,
            startDate: new Date(),
            trialEndDate,
            status: SubscriptionStatus.TRIAL,
        });

        return this.tenantSubscriptionRepository.save(subscription);
    }

    async createCheckoutSession(
        tenantId: number,
        planSlug: string,
        options: { billingInterval?: StripeBillingInterval } = {},
    ) {
        const plan = await this.subscriptionPlanService.findBySlug(planSlug);

        if (!plan) {
            throw new CustomNotFoundException({
                code: 'subscription-plan-not-found',
                message: 'Subscription plan not found',
            });
        }

        const billingInterval: StripeBillingInterval = options.billingInterval || 'monthly';
        const priceId =
            billingInterval === 'yearly' ? plan.stripePriceIdYearly : plan.stripePriceIdMonthly;

        if (!priceId) {
            throw new CustomBadRequestException({
                code: 'stripe-price-not-configured',
                message: `Plan ${plan.slug} is not configured for ${billingInterval} billing`,
            });
        }

        const tenant = await this.tenantService.findById(tenantId);

        const baseUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:5173';
        const successUrl = `${baseUrl}/assinaturas?success=true`;
        const cancelUrl = `${baseUrl}/assinaturas?canceled=true`;

        const customer = await this.stripeService.ensureCustomer({
            tenantId,
            name: tenant.name,
            email: tenant.email,
            existingCustomerId: tenant.stripeCustomerId,
        });

        if (customer.id !== tenant.stripeCustomerId) {
            await this.tenantService.updateStripeCustomerId(tenantId, customer.id);
        }

        const perUserPriceId =
            billingInterval === 'yearly'
                ? plan.stripePriceIdPerUserYearly
                : plan.stripePriceIdPerUserMonthly;

        const session = await this.stripeService.createCheckoutSession({
            tenantId,
            priceId,
            perUserPriceId: perUserPriceId || undefined,
            billingInterval,
            planSlug,
            successUrl,
            cancelUrl,
            customerId: customer.id,
        });

        return {
            checkoutUrl: session.url,
            sessionId: session.id,
        };
    }

    async syncMeteredUsage(tenantId: number) {
        const subscription = await this.findCurrentTenantSubscription(tenantId);
        if (
            !subscription ||
            !subscription.subscriptionPlan ||
            !subscription.stripeSubscriptionItemIdPerUser ||
            !subscription.subscriptionPlan.maxUsers
        ) {
            return {
                reportedUsers: 0,
            };
        }

        const currentUsers = await this.getCurrentUserCount(tenantId);
        const includedUsers = subscription.subscriptionPlan.maxUsers || 0;
        const additionalUsers = Math.max(0, currentUsers - includedUsers);

        await this.stripeService.reportUsage(
            subscription.stripeSubscriptionItemIdPerUser,
            additionalUsers,
            'set',
        );

        return {
            reportedUsers: additionalUsers,
            currentUsers,
            includedUsers,
        };
    }

    private mapStripeStatus(status: Stripe.Subscription.Status): SubscriptionStatus {
        switch (status) {
            case 'trialing':
                return SubscriptionStatus.TRIAL;
            case 'active':
                return SubscriptionStatus.ACTIVE;
            case 'past_due':
            case 'unpaid':
                return SubscriptionStatus.SUSPENDED;
            case 'canceled':
                return SubscriptionStatus.CANCELLED;
            default:
                return SubscriptionStatus.ACTIVE;
        }
    }

    async activateSubscription(
        tenantId: number,
        planSlug: string,
        options: ActivateSubscriptionOptions = {},
    ) {
        const plan = await this.subscriptionPlanService.findBySlug(planSlug);

        if (!plan) {
            throw new CustomNotFoundException({
                code: 'subscription-plan-not-found',
                message: 'Subscription plan not found',
            });
        }

        const billingInterval: StripeBillingInterval = options.billingInterval || 'monthly';
        const priceId =
            billingInterval === 'yearly' ? plan.stripePriceIdYearly : plan.stripePriceIdMonthly;

        if (!priceId) {
            throw new CustomBadRequestException({
                code: 'stripe-price-not-configured',
                message: `Plan ${plan.slug} is not configured for ${billingInterval} billing`,
            });
        }

        const tenant = await this.tenantService.findById(tenantId);
        const customer = await this.stripeService.ensureCustomer({
            tenantId,
            name: tenant.name,
            email: tenant.email,
            existingCustomerId: tenant.stripeCustomerId,
        });

        if (customer.id !== tenant.stripeCustomerId) {
            await this.tenantService.updateStripeCustomerId(tenantId, customer.id);
        }

        const currentSubscription = await this.findCurrentTenantSubscription(tenantId);
        if (currentSubscription?.stripeSubscriptionId) {
            try {
                await this.stripeService.cancelSubscription(
                    currentSubscription.stripeSubscriptionId,
                );
            } catch (error) {
                this.logger.error(
                    `Failed to cancel previous Stripe subscription ${currentSubscription.stripeSubscriptionId}`,
                    error instanceof Error ? error.stack : undefined,
                );
            }

            await this.tenantSubscriptionRepository.update(currentSubscription.id, {
                cancelledAt: new Date(),
                status: SubscriptionStatus.CANCELLED,
            });
        }

        await this.tenantSubscriptionRepository.delete({
            tenantId,
            status: SubscriptionStatus.TRIAL,
        });

        const items: Stripe.SubscriptionCreateParams.Item[] = [{ price: priceId }];

        const perUserPriceId =
            billingInterval === 'yearly'
                ? plan.stripePriceIdPerUserYearly
                : plan.stripePriceIdPerUserMonthly;

        if (perUserPriceId) {
            items.push({ price: perUserPriceId });
        }

        const stripeSubscription = await this.stripeService.createSubscription({
            customerId: customer.id,
            items,
            collectionMethod: options.collectionMethod,
            metadata: {
                tenantId: tenantId.toString(),
                planSlug,
                billingInterval,
            },
        });

        const baseItem = stripeSubscription.items.data.find((item) => item.price.id === priceId);
        const perUserItem = perUserPriceId
            ? stripeSubscription.items.data.find((item) => item.price.id === perUserPriceId)
            : undefined;

        const subscription = this.tenantSubscriptionRepository.create({
            tenantId,
            subscriptionPlanId: plan.id,
            startDate: new Date(stripeSubscription.start_date * 1000),
            status: this.mapStripeStatus(stripeSubscription.status),
            stripeSubscriptionId: stripeSubscription.id,
            stripeSubscriptionItemIdBase: baseItem?.id,
            stripeSubscriptionItemIdPerUser: perUserItem?.id,
        });

        return this.tenantSubscriptionRepository.save(subscription);
    }

    async validateUserLimit(
        tenantId: number,
    ): Promise<{ isValid: boolean; currentUsers: number; maxUsers: number | null }> {
        const subscription = await this.findCurrentTenantSubscription(tenantId);
        const currentUsers = await this.getCurrentUserCount(tenantId);

        if (!subscription || !subscription.subscriptionPlan) {
            return { isValid: false, currentUsers, maxUsers: 0 };
        }

        const maxUsers = subscription.subscriptionPlan.maxUsers;

        if (maxUsers === null) {
            return { isValid: true, currentUsers, maxUsers };
        }

        return {
            isValid: currentUsers <= maxUsers,
            currentUsers,
            maxUsers,
        };
    }

    async getSubscriptionSummary(tenantId: number) {
        const subscription = await this.findCurrentTenantSubscription(tenantId);
        const userStats = await this.userService.getUserStatistics(tenantId);

        if (!subscription) {
            return {
                hasSubscription: false,
                userStats,
            };
        }

        const validation = await this.validateUserLimit(tenantId);

        // Calculate billing information for active subscriptions
        let billingInfo = null;
        if (subscription.status === SubscriptionStatus.ACTIVE) {
            try {
                const currentUsers = await this.getCurrentUserCount(tenantId);
                const plan = subscription.subscriptionPlan;
                const basePlanCost = Number(plan.priceMonthly);
                let additionalUsersCost = 0;
                let additionalUsers = 0;
                let totalCost = basePlanCost;

                // Calculate additional user costs if exceeding plan limits
                if (plan.maxUsers && currentUsers > plan.maxUsers) {
                    additionalUsers = currentUsers - plan.maxUsers;
                    const additionalPlan =
                        await this.subscriptionPlanService.findBySlug('adicional');

                    if (additionalPlan) {
                        const additionalUserRate = Number(additionalPlan.priceMonthly); // R$ 15 per user
                        additionalUsersCost = additionalUsers * additionalUserRate;
                        totalCost = basePlanCost + additionalUsersCost;
                    }
                }

                billingInfo = {
                    basePlanCost,
                    additionalUsersCost,
                    totalCost,
                    additionalUsers,
                    currentUsers,
                    exceedsLimit: currentUsers > (plan.maxUsers || Infinity),
                };
            } catch (error) {
                console.error('Error calculating billing info:', error);
                // Continue without billing info if calculation fails
            }
        }

        return {
            hasSubscription: true,
            subscription: {
                id: subscription.id,
                status: subscription.status,
                planName: subscription.subscriptionPlan?.name,
                planSlug: subscription.subscriptionPlan?.slug,
                maxUsers: subscription.subscriptionPlan?.maxUsers,
                startDate: subscription.startDate,
                endDate: subscription.endDate,
                trialEndDate: subscription.trialEndDate?.toISOString(),
                isActive: subscription.isActive,
            },
            userStats,
            validation,
            billing: billingInfo,
        };
    }

    async renewTrial(tenantId: number): Promise<any> {
        const subscription = await this.findCurrentTenantSubscription(tenantId);
        if (!subscription || subscription.status !== SubscriptionStatus.TRIAL) {
            throw new Error('No active trial subscription to renew');
        }
        const now = new Date();
        const baseDate =
            subscription.trialEndDate && subscription.trialEndDate > now
                ? new Date(subscription.trialEndDate)
                : now;
        baseDate.setDate(baseDate.getDate() + 14);
        subscription.trialEndDate = baseDate;
        await this.tenantSubscriptionRepository.save(subscription);
        return subscription;
    }

    async syncSubscriptionFromStripe(
        tenantId: number,
        stripeSubscriptionId: string,
        planSlug: string,
    ) {
        const stripeSubscription =
            await this.stripeService.retrieveSubscription(stripeSubscriptionId);
        const plan = await this.subscriptionPlanService.findBySlug(planSlug);

        if (!plan) {
            this.logger.error(
                `Plan ${planSlug} not found when syncing subscription ${stripeSubscriptionId}`,
            );
            return;
        }

        const tenant = await this.tenantService.findById(tenantId);

        if (stripeSubscription.customer && typeof stripeSubscription.customer === 'string') {
            if (tenant.stripeCustomerId !== stripeSubscription.customer) {
                await this.tenantService.updateStripeCustomerId(
                    tenantId,
                    stripeSubscription.customer,
                );
            }
        }

        const currentSubscription = await this.tenantSubscriptionRepository.findOne({
            where: { stripeSubscriptionId },
        });

        const baseItem = stripeSubscription.items.data[0];
        const perUserItem = stripeSubscription.items.data.find(
            (item) =>
                item.price.id === plan.stripePriceIdPerUserMonthly ||
                item.price.id === plan.stripePriceIdPerUserYearly,
        );

        // Determine endDate: use cancel_at if scheduled, otherwise current_period_end
        const endDate = stripeSubscription.cancel_at
            ? new Date(stripeSubscription.cancel_at * 1000)
            : stripeSubscription.current_period_end
              ? new Date(stripeSubscription.current_period_end * 1000)
              : null;

        const subscriptionData = {
            tenantId,
            subscriptionPlanId: plan.id,
            startDate: new Date(stripeSubscription.start_date * 1000),
            endDate,
            // Note: trialEndDate is not synced from Stripe - we control trials internally
            cancelledAt: stripeSubscription.canceled_at
                ? new Date(stripeSubscription.canceled_at * 1000)
                : null,
            status: this.mapStripeStatus(stripeSubscription.status),
            stripeSubscriptionId: stripeSubscription.id,
            stripeSubscriptionItemIdBase: baseItem?.id,
            stripeSubscriptionItemIdPerUser: perUserItem?.id,
        };

        if (currentSubscription) {
            await this.tenantSubscriptionRepository.update(
                currentSubscription.id,
                subscriptionData,
            );
            this.logger.log(`Updated subscription ${currentSubscription.id} from Stripe webhook`);
        } else {
            const newSubscription = this.tenantSubscriptionRepository.create(subscriptionData);
            await this.tenantSubscriptionRepository.save(newSubscription);
            this.logger.log(`Created subscription ${newSubscription.id} from Stripe webhook`);
        }
    }

    async handleSubscriptionCancelled(tenantId: number, stripeSubscriptionId: string) {
        const subscription = await this.tenantSubscriptionRepository.findOne({
            where: { stripeSubscriptionId },
        });

        if (subscription) {
            await this.tenantSubscriptionRepository.update(subscription.id, {
                status: SubscriptionStatus.CANCELLED,
                cancelledAt: new Date(),
            });
            this.logger.log(`Cancelled subscription ${subscription.id} for tenant ${tenantId}`);
        }
    }

    async handleInvoicePaymentSucceeded(tenantId: number, invoiceId: string) {
        this.logger.log(`Invoice payment succeeded for tenant ${tenantId}, invoice ${invoiceId}`);

        try {
            const invoice = await this.stripeService.retrieveInvoice(invoiceId);

            const subscription = await this.findCurrentTenantSubscription(tenantId);
            if (!subscription) {
                this.logger.warn(
                    `No subscription found for tenant ${tenantId} when processing payment for invoice ${invoiceId}`,
                );
                return;
            }

            const existingPayment = await this.paymentService.findBySubscriptionId(subscription.id);
            const paymentExists = existingPayment.some(
                (p) => p.externalTransactionId === invoice.id,
            );

            if (paymentExists) {
                this.logger.debug(
                    `Payment record already exists for invoice ${invoiceId}, skipping creation`,
                );
                return;
            }

            const amount = invoice.amount_paid / 100;

            const payment = await this.paymentService.createPayment({
                tenantId,
                tenantSubscriptionId: subscription.id,
                amount,
                dueDate: invoice.due_date ? new Date(invoice.due_date * 1000) : new Date(),
                description: invoice.description || `Payment for subscription ${subscription.id}`,
            });

            await this.paymentService.markAsPaid(payment.id, PaymentMethod.CREDIT_CARD, invoice.id);

            if (invoice.hosted_invoice_url) {
                await this.paymentService.setInvoiceUrl(payment.id, invoice.hosted_invoice_url);
            }

            await this.paymentService.updatePaymentStatus(payment.id, PaymentStatus.COMPLETED, {
                stripeCustomerId:
                    typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id,
                stripeSubscriptionId:
                    typeof invoice.subscription === 'string'
                        ? invoice.subscription
                        : invoice.subscription?.id,
                invoiceNumber: invoice.number,
                invoicePeriodStart: invoice.period_start
                    ? new Date(invoice.period_start * 1000).toISOString()
                    : null,
                invoicePeriodEnd: invoice.period_end
                    ? new Date(invoice.period_end * 1000).toISOString()
                    : null,
                currency: invoice.currency,
            });

            this.logger.log(
                `Created payment record ${payment.id} for tenant ${tenantId}, invoice ${invoiceId}`,
            );
        } catch (error) {
            this.logger.error(
                `Failed to create payment record for invoice ${invoiceId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
            );
        }
    }

    async handleInvoicePaymentFailed(tenantId: number, invoiceId: string) {
        const subscription = await this.findCurrentTenantSubscription(tenantId);
        if (subscription) {
            await this.tenantSubscriptionRepository.update(subscription.id, {
                status: SubscriptionStatus.SUSPENDED,
            });
            this.logger.warn(
                `Suspended subscription ${subscription.id} for tenant ${tenantId} due to payment failure, invoice ${invoiceId}`,
            );
        }
    }

    async createCustomerPortalSession(tenantId: number, returnUrl: string): Promise<string> {
        const tenant = await this.tenantService.findById(tenantId);

        if (!tenant) {
            throw new CustomNotFoundException({
                code: 'tenant-not-found',
                message: `Tenant ${tenantId} not found`,
            });
        }

        if (!tenant.stripeCustomerId) {
            throw new CustomBadRequestException({
                code: 'no-stripe-customer',
                message: 'No Stripe customer ID found. Please subscribe to a plan first.',
            });
        }

        const session = await this.stripeService.createCustomerPortalSession(
            tenant.stripeCustomerId,
            returnUrl,
        );

        return session.url;
    }
}
