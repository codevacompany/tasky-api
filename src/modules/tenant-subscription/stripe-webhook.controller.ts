import {
    Controller,
    Post,
    Headers,
    HttpCode,
    HttpStatus,
    Logger,
    RawBodyRequest,
    Req,
} from '@nestjs/common';
import { Request } from 'express';
import { StripeService } from '../../shared/services/stripe/stripe.service';
import { ConfigService } from '@nestjs/config';
import { TenantSubscriptionService } from './tenant-subscription.service';
import { SubscriptionPlanService } from '../subscription-plan/subscription-plan.service';
import Stripe from 'stripe';

@Controller('stripe/webhook')
export class StripeWebhookController {
    private readonly logger = new Logger(StripeWebhookController.name);
    private readonly webhookSecret: string;

    constructor(
        private readonly stripeService: StripeService,
        private readonly configService: ConfigService,
        private readonly tenantSubscriptionService: TenantSubscriptionService,
        private readonly subscriptionPlanService: SubscriptionPlanService,
    ) {
        this.webhookSecret = this.configService.get<string>('STRIPE_WEBHOOK_SECRET') || '';
        if (!this.webhookSecret) {
            this.logger.warn(
                'STRIPE_WEBHOOK_SECRET is not set. Webhook signature verification will be disabled.',
            );
        }
    }

    @Post()
    @HttpCode(HttpStatus.OK)
    async handleWebhook(
        @Req() req: RawBodyRequest<Request>,
        @Headers('stripe-signature') signature: string,
    ) {
        if (!this.webhookSecret) {
            this.logger.error('Webhook secret not configured. Cannot verify signature.');
            return { received: false, error: 'Webhook secret not configured' };
        }

        if (!signature) {
            this.logger.error('Missing stripe-signature header');
            return { received: false, error: 'Missing signature' };
        }

        // When using raw() middleware, body is available as Buffer in req.body
        let rawBody: Buffer;
        if (Buffer.isBuffer(req.body)) {
            rawBody = req.body;
        } else if (req.rawBody && Buffer.isBuffer(req.rawBody)) {
            rawBody = req.rawBody;
        } else if (req.body) {
            // Last resort: try to convert to buffer
            rawBody = Buffer.from(JSON.stringify(req.body));
            this.logger.warn('Using JSON stringified body as fallback');
        } else {
            this.logger.error('No webhook payload was provided');
            return { received: false, error: 'No webhook payload was provided' };
        }

        let event: Stripe.Event;

        try {
            event = this.stripeService.client.webhooks.constructEvent(
                rawBody,
                signature,
                this.webhookSecret,
            );
        } catch (err) {
            this.logger.error(
                `Webhook signature verification failed: ${err instanceof Error ? err.message : 'Unknown error'}`,
            );
            return { received: false, error: 'Invalid signature' };
        }

        this.logger.log(`Received webhook event: ${event.type}`);

        try {
            switch (event.type) {
                case 'checkout.session.completed':
                    await this.handleCheckoutSessionCompleted(event);
                    break;

                case 'customer.subscription.created':
                    await this.handleSubscriptionCreated(event);
                    break;

                case 'customer.subscription.updated':
                    await this.handleSubscriptionUpdated(event);
                    break;

                case 'customer.subscription.deleted':
                    await this.handleSubscriptionDeleted(event);
                    break;

                case 'invoice.payment_succeeded':
                    await this.handleInvoicePaymentSucceeded(event);
                    break;

                case 'invoice.payment_failed':
                    await this.handleInvoicePaymentFailed(event);
                    break;

                default:
                    this.logger.debug(`Unhandled event type: ${event.type}`);
            }

            return { received: true };
        } catch (error) {
            this.logger.error(
                `Error processing webhook ${event.type}: ${error instanceof Error ? error.message : 'Unknown error'}`,
                error instanceof Error ? error.stack : undefined,
            );
            throw error;
        }
    }

    private async handleCheckoutSessionCompleted(event: Stripe.Event) {
        const session = event.data.object as Stripe.Checkout.Session;

        if (session.mode !== 'subscription') {
            this.logger.debug('Checkout session is not a subscription, skipping');
            return;
        }

        const tenantId = parseInt(session.metadata?.tenantId || '0', 10);
        const planSlug = session.metadata?.planSlug || '';

        if (!tenantId || !planSlug) {
            this.logger.error(
                `Missing required metadata in checkout session: tenantId=${tenantId}, planSlug=${planSlug}`,
            );
            return;
        }

        if (!session.subscription) {
            this.logger.error('Checkout session completed but no subscription ID found');
            return;
        }

        this.logger.log(
            `Checkout session completed for tenant ${tenantId}, plan ${planSlug}, subscription ${session.subscription}`,
        );

        await this.tenantSubscriptionService.syncSubscriptionFromStripe(
            tenantId,
            session.subscription as string,
            planSlug,
        );
    }

    private async handleSubscriptionCreated(event: Stripe.Event) {
        const subscription = event.data.object as Stripe.Subscription;
        const tenantId = parseInt(subscription.metadata?.tenantId || '0', 10);
        const planSlug = subscription.metadata?.planSlug || '';

        if (!tenantId || !planSlug) {
            this.logger.debug(
                `Subscription created but missing metadata: tenantId=${tenantId}, planSlug=${planSlug}`,
            );
            return;
        }

        const existingSubscription =
            await this.tenantSubscriptionService.findByStripeSubscriptionId(subscription.id);

        if (existingSubscription) {
            this.logger.debug(
                `Subscription ${subscription.id} already exists, likely processed by checkout.session.completed. Skipping.`,
            );
            return;
        }

        this.logger.log(
            `Subscription created for tenant ${tenantId}, plan ${planSlug}, subscription ${subscription.id}`,
        );

        await this.tenantSubscriptionService.syncSubscriptionFromStripe(
            tenantId,
            subscription.id,
            planSlug,
        );
    }

    private async handleSubscriptionUpdated(event: Stripe.Event) {
        const subscription = event.data.object as Stripe.Subscription;
        const tenantId = parseInt(subscription.metadata?.tenantId || '0', 10);

        if (!tenantId) {
            this.logger.debug(`Subscription updated but missing tenantId in metadata`);
            return;
        }

        this.logger.log(
            `Subscription updated for tenant ${tenantId}, subscription ${subscription.id}`,
        );

        let planSlug = subscription.metadata?.planSlug || '';

        for (const item of subscription.items.data) {
            const priceId = item.price?.id;
            if (priceId) {
                const planByPrice = await this.subscriptionPlanService.findByStripePriceId(priceId);
                if (planByPrice) {
                    planSlug = planByPrice.slug;
                    this.logger.log(
                        `Detected plan change via price ID: ${planSlug} for subscription ${subscription.id} (matched price: ${priceId})`,
                    );
                    break;
                }
            }
        }

        // If we still don't have a planSlug, try to get it from existing subscription
        if (!planSlug) {
            const existingSubscription =
                await this.tenantSubscriptionService.findByStripeSubscriptionId(subscription.id);
            if (existingSubscription) {
                const currentPlan = await this.subscriptionPlanService.findWithPermissions(
                    existingSubscription.subscriptionPlanId,
                );
                if (currentPlan) {
                    planSlug = currentPlan.slug;
                    this.logger.debug(
                        `Using existing plan ${planSlug} for subscription ${subscription.id}`,
                    );
                }
            }
        }

        if (!planSlug) {
            this.logger.warn(
                `Could not determine plan for subscription ${subscription.id}, skipping sync`,
            );
            return;
        }

        await this.tenantSubscriptionService.syncSubscriptionFromStripe(
            tenantId,
            subscription.id,
            planSlug,
        );
    }

    private async handleSubscriptionDeleted(event: Stripe.Event) {
        const subscription = event.data.object as Stripe.Subscription;
        const tenantId = parseInt(subscription.metadata?.tenantId || '0', 10);

        if (!tenantId) {
            this.logger.debug(`Subscription deleted but missing tenantId in metadata`);
            return;
        }

        this.logger.log(
            `Subscription deleted for tenant ${tenantId}, subscription ${subscription.id}`,
        );

        await this.tenantSubscriptionService.handleSubscriptionCancelled(tenantId, subscription.id);
    }

    private async handleInvoicePaymentSucceeded(event: Stripe.Event) {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId = await this.extractSubscriptionIdFromInvoice(invoice);

        if (!subscriptionId) {
            this.logger.debug(
                `Invoice payment succeeded (${invoice.id}) but no subscription ID found.`,
            );
            return;
        }

        const tenantId = await this.extractTenantIdFromSubscription(subscriptionId);
        if (!tenantId) {
            this.logger.debug(
                'Invoice payment succeeded but missing tenantId in subscription metadata',
            );
            return;
        }

        this.logger.log(`Invoice payment succeeded for tenant ${tenantId}, invoice ${invoice.id}`);
        await this.tenantSubscriptionService.handleInvoicePaymentSucceeded(tenantId, invoice.id);
    }

    private async handleInvoicePaymentFailed(event: Stripe.Event) {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId = await this.extractSubscriptionIdFromInvoice(invoice);

        if (!subscriptionId) {
            this.logger.debug(
                `Invoice payment failed (${invoice.id}) but no subscription ID found. This is normal for one-time invoices or timing issues on first payment.`,
            );
            return;
        }

        const tenantId = await this.extractTenantIdFromSubscription(subscriptionId);
        if (!tenantId) {
            this.logger.debug(
                'Invoice payment failed but missing tenantId in subscription metadata',
            );
            return;
        }

        this.logger.warn(`Invoice payment failed for tenant ${tenantId}, invoice ${invoice.id}`);
        await this.tenantSubscriptionService.handleInvoicePaymentFailed(tenantId, invoice.id);
    }

    private async extractSubscriptionIdFromInvoice(
        invoice: Stripe.Invoice,
    ): Promise<string | undefined> {
        if (invoice.subscription) {
            return typeof invoice.subscription === 'string'
                ? invoice.subscription
                : invoice.subscription.id;
        }

        try {
            const fullInvoice = await this.stripeService.retrieveInvoice(invoice.id);
            const subscriptionId =
                typeof fullInvoice.subscription === 'string'
                    ? fullInvoice.subscription
                    : fullInvoice.subscription?.id;

            if (subscriptionId) {
                this.logger.debug(`Retrieved subscription ID from Stripe API: ${subscriptionId}`);
            }

            return subscriptionId;
        } catch (error) {
            this.logger.error(
                `Failed to retrieve invoice from Stripe: ${error instanceof Error ? error.message : 'Unknown error'}`,
            );
            return undefined;
        }
    }

    private async extractTenantIdFromSubscription(
        subscriptionId: string,
    ): Promise<number | undefined> {
        try {
            const subscription = await this.stripeService.retrieveSubscription(subscriptionId);
            const tenantId = parseInt(subscription.metadata?.tenantId || '0', 10);
            return tenantId > 0 ? tenantId : undefined;
        } catch (error) {
            this.logger.error(
                `Failed to retrieve subscription from Stripe: ${error instanceof Error ? error.message : 'Unknown error'}`,
            );
            return undefined;
        }
    }
}
