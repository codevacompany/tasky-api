import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';

export type StripeBillingInterval = 'monthly' | 'yearly';

export interface EnsureStripeCustomerOptions {
    tenantId: number;
    name?: string;
    email?: string;
    existingCustomerId?: string | null;
    metadata?: Stripe.MetadataParam;
}

export interface CreateStripeSubscriptionOptions {
    customerId: string;
    items: Stripe.SubscriptionCreateParams.Item[];
    metadata?: Stripe.MetadataParam;
    collectionMethod?: Stripe.SubscriptionCreateParams.CollectionMethod;
    daysUntilDue?: number;
    paymentBehavior?: Stripe.SubscriptionCreateParams.PaymentBehavior;
    trialSettings?: Stripe.SubscriptionCreateParams.TrialSettings;
}

export interface CreateCheckoutSessionOptions {
    tenantId: number;
    priceId: string;
    perUserPriceId?: string;
    billingInterval: StripeBillingInterval;
    planSlug: string;
    successUrl: string;
    cancelUrl: string;
    customerId?: string;
    customerEmail?: string;
    customerName?: string;
}

@Injectable()
export class StripeService {
    private readonly logger = new Logger(StripeService.name);
    private readonly stripe: Stripe;
    private readonly defaultCollectionMethod: Stripe.SubscriptionCreateParams.CollectionMethod;
    private readonly defaultDaysUntilDue: number;

    constructor(private readonly configService: ConfigService) {
        const secretKey = this.configService.get<string>('STRIPE_SECRET_KEY');

        if (!secretKey) {
            throw new Error('Missing STRIPE_SECRET_KEY env variable');
        }

        this.stripe = new Stripe(secretKey);

        this.defaultCollectionMethod =
            (this.configService.get(
                'STRIPE_COLLECTION_METHOD',
            ) as Stripe.SubscriptionCreateParams.CollectionMethod) || 'send_invoice';
        this.defaultDaysUntilDue = Number(this.configService.get('STRIPE_DAYS_UNTIL_DUE') ?? 7);
    }

    get client(): Stripe {
        return this.stripe;
    }

    async ensureCustomer(options: EnsureStripeCustomerOptions): Promise<Stripe.Customer> {
        if (options.existingCustomerId) {
            try {
                const existingCustomer = await this.stripe.customers.retrieve(
                    options.existingCustomerId,
                );

                if (!('deleted' in existingCustomer) || !existingCustomer.deleted) {
                    return existingCustomer as Stripe.Customer;
                }
            } catch (error) {
                this.logger.warn(
                    `Existing Stripe customer ${options.existingCustomerId} could not be retrieved. Creating a new one. Reason: ${
                        error instanceof Error ? error.message : 'Unknown error'
                    }`,
                );
            }
        }

        return this.stripe.customers.create({
            name: options.name,
            email: options.email,
            metadata: {
                tenantId: options.tenantId.toString(),
                ...(options.metadata || {}),
            },
        });
    }

    async createSubscription(options: CreateStripeSubscriptionOptions) {
        const params: Stripe.SubscriptionCreateParams = {
            customer: options.customerId,
            items: options.items,
            metadata: options.metadata,
        };

        const collectionMethod = options.collectionMethod || this.defaultCollectionMethod;

        if (collectionMethod === 'send_invoice') {
            params.collection_method = 'send_invoice';
            params.days_until_due = options.daysUntilDue ?? this.defaultDaysUntilDue;
        } else {
            params.collection_method = 'charge_automatically';
            params.payment_behavior = options.paymentBehavior ?? 'default_incomplete';
        }

        if (options.trialSettings) {
            params.trial_settings = options.trialSettings;
        }

        return this.stripe.subscriptions.create(params);
    }

    async cancelSubscription(subscriptionId: string, invoiceNow: boolean = false) {
        return this.stripe.subscriptions.cancel(subscriptionId, {
            invoice_now: invoiceNow,
            prorate: true,
        });
    }

    async reportUsage(
        subscriptionItemId: string,
        quantity: number,
        action: 'set' | 'increment' = 'set',
        timestamp: Date = new Date(),
    ) {
        return this.stripe.subscriptionItems.createUsageRecord(subscriptionItemId, {
            quantity,
            action,
            timestamp: Math.floor(timestamp.getTime() / 1000),
        });
    }

    async retrieveSubscription(subscriptionId: string) {
        return this.stripe.subscriptions.retrieve(subscriptionId, {
            expand: ['items'],
        });
    }

    async retrieveInvoice(invoiceId: string) {
        return this.stripe.invoices.retrieve(invoiceId, {
            expand: ['subscription'],
        });
    }

    async createCustomerPortalSession(
        customerId: string,
        returnUrl: string,
    ): Promise<Stripe.BillingPortal.Session> {
        return this.stripe.billingPortal.sessions.create({
            customer: customerId,
            return_url: returnUrl,
        });
    }

    async createCheckoutSession(
        options: CreateCheckoutSessionOptions,
    ): Promise<Stripe.Checkout.Session> {
        const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [
            {
                price: options.priceId,
                quantity: 1,
            },
        ];

        if (options.perUserPriceId) {
            lineItems.push({
                price: options.perUserPriceId,
                quantity: 1,
            });
        }

        const sessionParams: Stripe.Checkout.SessionCreateParams = {
            mode: 'subscription',
            line_items: lineItems,
            success_url: options.successUrl,
            cancel_url: options.cancelUrl,
            metadata: {
                tenantId: options.tenantId.toString(),
                planSlug: options.planSlug,
                billingInterval: options.billingInterval,
            },
            subscription_data: {
                metadata: {
                    tenantId: options.tenantId.toString(),
                    planSlug: options.planSlug,
                    billingInterval: options.billingInterval,
                },
            },
        };

        if (options.customerId) {
            sessionParams.customer = options.customerId;
        } else if (options.customerEmail) {
            sessionParams.customer_email = options.customerEmail;
        }

        return this.stripe.checkout.sessions.create(sessionParams);
    }
}
