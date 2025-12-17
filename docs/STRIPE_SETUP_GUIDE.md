# Stripe Integration Setup Guide

This guide will help you set up Stripe for your Tasky Pro subscription plans.

## Plans Overview

Your application has the following subscription plans:

1. **Plano Básico** (Basic Plan)

    - Monthly: R$ 99.00
    - Yearly: R$ 950.00
    - Max Users: 5

2. **Plano Essencial** (Essential Plan)

    - Monthly: R$ 199.00
    - Yearly: R$ 1,900.00
    - Max Users: 15

3. **Plano Avançado** (Advanced Plan)

    - Monthly: R$ 399.00
    - Yearly: R$ 3,800.00
    - Max Users: 30

4. **Plano Customizado** (Custom Plan)
    - Custom pricing (requires manual setup)

---

## Step 1: Access Stripe Dashboard

1. Go to [https://dashboard.stripe.com](https://dashboard.stripe.com)
2. Sign in or create an account
3. **Important**: Start with **Test Mode** to test your integration before going live

---

## Step 2: Create Products

For each plan, you'll create a Product in Stripe:

### 2.1 Create Product: Plano Básico

1. Navigate to **Products** → **Add product**
2. Fill in the details:
    - **Name**: `Plano Básico`
    - **Description**: `Ideal para microempresas e startups`
    - **Metadata** (optional but recommended):
        - `slug`: `basico`
        - `max_users`: `5`
        - `plan_id`: `1` (or your database plan ID)
3. Click **Save product**

### 2.2 Create Product: Plano Essencial

1. Navigate to **Products** → **Add product**
2. Fill in the details:
    - **Name**: `Plano Essencial`
    - **Description**: `Ideal para pequenas empresas em crescimento`
    - **Metadata**:
        - `slug`: `essencial`
        - `max_users`: `15`
        - `plan_id`: `2`
3. Click **Save product**

### 2.3 Create Product: Plano Avançado

1. Navigate to **Products** → **Add product**
2. Fill in the details:
    - **Name**: `Plano Avançado`
    - **Description**: `Ideal para empresas médias`
    - **Metadata**:
        - `slug`: `avancado`
        - `max_users`: `30`
        - `plan_id`: `3`
3. Click **Save product**

### 2.4 Create Product: Plano Customizado (Optional)

1. Navigate to **Products** → **Add product**
2. Fill in the details:
    - **Name**: `Plano Customizado`
    - **Description**: `Plano personalizado conforme necessidade`
    - **Metadata**:
        - `slug`: `customizado`
        - `plan_id`: `4`
3. Click **Save product**

---

## Step 3: Create Prices for Each Product

For each product, create two prices: Monthly and Yearly.

### 3.1 Plano Básico Prices

#### Monthly Price:

1. In the product page, click **Add price**
2. Configure:
    - **Price**: `99.00`
    - **Currency**: `BRL` (Brazilian Real)
    - **Billing period**: `Monthly`
    - **Recurring**: ✅ Enabled
    - **Price ID** (save this): `price_xxxxx_basico_monthly`
3. Click **Add price**

#### Yearly Price:

1. Click **Add price** again
2. Configure:
    - **Price**: `950.00`
    - **Currency**: `BRL`
    - **Billing period**: `Yearly`
    - **Recurring**: ✅ Enabled
    - **Price ID** (save this): `price_xxxxx_basico_yearly`
3. Click **Add price**

### 3.2 Plano Essencial Prices

#### Monthly Price:

-   **Price**: `199.00 BRL`
-   **Billing period**: `Monthly`
-   **Price ID**: `price_xxxxx_essencial_monthly`

#### Yearly Price:

-   **Price**: `1900.00 BRL`
-   **Billing period**: `Yearly`
-   **Price ID**: `price_xxxxx_essencial_yearly`

### 3.3 Plano Avançado Prices

#### Monthly Price:

-   **Price**: `399.00 BRL`
-   **Billing period**: `Monthly`
-   **Price ID**: `price_xxxxx_avancado_monthly`

#### Yearly Price:

-   **Price**: `3800.00 BRL`
-   **Billing period**: `Yearly`
-   **Price ID**: `price_xxxxx_avancado_yearly`

### 3.4 Plano Customizado Prices (Metered Billing)

The Customizado plan uses **metered billing** with:

-   **Base price**: R$ 399.00/month (for up to 30 users)
-   **Additional users**: R$ 15.00 per user after the 30th user

#### Step 1: Create Base Recurring Price

1. In the "Plano Customizado" product page, click **Add price**
2. Configure the base subscription:
    - **Price**: `399.00`
    - **Currency**: `BRL`
    - **Billing period**: `Monthly`
    - **Recurring**: ✅ Enabled
    - **Price ID** (save this): `price_xxxxx_customizado_base`
3. Click **Add price**

#### Step 2: Create Metered Price for Additional Users

1. Click **Add price** again
2. Configure the metered component:
    - **Price model**: Select **Metered pricing**
    - **Per unit price**: `15.00`
    - **Currency**: `BRL`
    - **Billing period**: `Monthly`
    - **Recurring**: ✅ Enabled
    - **Metered unit**: Select **Custom** and enter `additional_user` or `user_over_30`
    - **Price ID** (save this): `price_xxxxx_customizado_per_user`
3. Click **Add price**

#### Step 3: Create a Price for Combined Subscription (Alternative Method)

**Option A: Separate Prices (Recommended)**

-   Create a subscription with both prices attached
-   Base price: `price_xxxxx_customizado_base`
-   Metered price: `price_xxxxx_customizado_per_user`

**Option B: Single Price with Usage**

-   Use Stripe's billing meter feature (requires API setup)

#### Implementation Notes:

When creating a subscription for the Customizado plan, you'll need to:

1. **Create subscription with base price**:

    ```javascript
    const subscription = await stripe.subscriptions.create({
        customer: customerId,
        items: [
            { price: 'price_xxxxx_customizado_base' },
            { price: 'price_xxxxx_customizado_per_user' },
        ],
    });
    ```

2. **Report usage monthly** (for users over 30):

    ```javascript
    // Calculate additional users (total users - 30)
    const additionalUsers = Math.max(0, totalUsers - 30);

    await stripe.subscriptionItems.createUsageRecord(
        subscriptionItemId, // The metered price subscription item ID
        {
            quantity: additionalUsers,
            timestamp: Math.floor(Date.now() / 1000),
        },
    );
    ```

3. **Update usage when user count changes**:
    - When a tenant adds/removes users
    - Calculate: `additionalUsers = max(0, currentUsers - 30)`
    - Report the new quantity to Stripe

#### Database Fields Needed:

For the Customizado plan, you'll need to track:

-   `stripe_price_id_per_user`: Metered price ID
-   `stripe_subscription_item_id_base`: Base subscription item ID
-   `stripe_subscription_item_id_per_user`: Metered subscription item ID

---

## Step 4: Get API Keys

1. Navigate to **Developers** → **API keys**
2. Copy the following keys (you'll need these for your backend):

### Test Mode:

-   **Publishable key**: `pk_test_xxxxx`
-   **Secret key**: `sk_test_xxxxx` (click "Reveal test key")

### Live Mode (after testing):

-   **Publishable key**: `pk_live_xxxxx`
-   **Secret key**: `sk_live_xxxxx`

**⚠️ Security Note**: Never commit secret keys to version control. Store them in environment variables.

### Backend Environment Variables

Configure the following variables in `tasky-api`:

```
STRIPE_SECRET_KEY=sk_test_xxxxx
STRIPE_COLLECTION_METHOD=send_invoice   # or charge_automatically
STRIPE_DAYS_UNTIL_DUE=7                # only used when sending invoices
```

---

## Step 5: Set Up Webhooks

Webhooks allow Stripe to notify your application about subscription events.

### 5.1 Create Webhook Endpoint

1. Navigate to **Developers** → **Webhooks**
2. Click **Add endpoint**
3. Configure:
    - **Endpoint URL**: `https://your-api-domain.com/api/stripe/webhook`
    - **Description**: `Tasky Pro Subscription Webhooks`
    - **Events to send**: Select the following events:
        - `customer.subscription.created`
        - `customer.subscription.updated`
        - `customer.subscription.deleted`
        - `customer.subscription.trial_will_end`
        - `invoice.payment_succeeded`
        - `invoice.payment_failed`
        - `payment_intent.succeeded`
        - `payment_intent.payment_failed`
        - `checkout.session.completed`
4. Click **Add endpoint**
5. **Copy the Signing secret**: `whsec_xxxxx` (save this for your backend)

### 5.2 Webhook Testing

1. Use Stripe CLI for local testing:
    ```bash
    stripe listen --forward-to localhost:3000/api/stripe/webhook
    ```
2. This will give you a webhook signing secret for local development

---

## Step 6: Database Integration

You'll need to store Stripe Price IDs in your database. Consider adding these fields to your `subscription_plan` table:

```sql
ALTER TABLE subscription_plan
ADD COLUMN stripe_price_id_monthly VARCHAR(255),
ADD COLUMN stripe_price_id_yearly VARCHAR(255),
-- For Customizado plan (metered billing)
ADD COLUMN stripe_price_id_per_user VARCHAR(255);
```

Then update your plans with the Stripe Price IDs:

```sql
-- Plano Básico
UPDATE subscription_plan
SET stripe_price_id_monthly = 'price_xxxxx_basico_monthly',
    stripe_price_id_yearly = 'price_xxxxx_basico_yearly'
WHERE slug = 'basico';

-- Plano Essencial
UPDATE subscription_plan
SET stripe_price_id_monthly = 'price_xxxxx_essencial_monthly',
    stripe_price_id_yearly = 'price_xxxxx_essencial_yearly'
WHERE slug = 'essencial';

-- Plano Avançado
UPDATE subscription_plan
SET stripe_price_id_monthly = 'price_xxxxx_avancado_monthly',
    stripe_price_id_yearly = 'price_xxxxx_avancado_yearly'
WHERE slug = 'avancado';

-- Plano Customizado (metered billing)
UPDATE subscription_plan
SET stripe_price_id_monthly = 'price_xxxxx_customizado_base',
    stripe_price_id_per_user = 'price_xxxxx_customizado_per_user'
WHERE slug = 'customizado';
```

**Note**: For the Customizado plan, you'll also need to store subscription item IDs in your `tenant_subscription` table to track usage:

```sql
ALTER TABLE tenant_subscription
ADD COLUMN stripe_subscription_id VARCHAR(255),
ADD COLUMN stripe_subscription_item_id_base VARCHAR(255),
ADD COLUMN stripe_subscription_item_id_per_user VARCHAR(255),
ADD COLUMN stripe_customer_id VARCHAR(255);
```

### Database Relationship Diagram

Here's how your database tables connect to Stripe:

```
┌─────────────────┐
│     Tenant      │
│  (your table)   │
│  id: 123        │
└────────┬────────┘
         │
         │ 1:1
         ▼
┌─────────────────────────────┐
│   tenant_subscription       │
│  (your table)               │
│  tenantId: 123              │
│  stripe_customer_id: cus_xxx│
│  stripe_subscription_id:    │
│    sub_xxx                   │
│  stripe_subscription_item_  │
│    id_per_user: si_xxx       │ ← This is what you use!
└─────────────────────────────┘
         │
         │ Links via IDs
         ▼
┌─────────────────────────────┐
│      Stripe Objects         │
│                             │
│  Customer (cus_xxx)         │
│    └─ Subscription (sub_xxx)│
│         └─ Item (si_xxx)    │ ← Usage reported here
└─────────────────────────────┘
```

**When Reporting Usage:**

```typescript
// 1. You have a tenantId (e.g., 123)
const tenantId = 123;

// 2. Look up tenant_subscription in YOUR database
const subscription = await db.tenant_subscription.findOne({
    where: { tenantId: 123 },
});
// Returns: { stripeSubscriptionItemIdPerUser: 'si_abc123xyz' }

// 3. Use that ID to report usage
await stripe.subscriptionItems.createUsageRecord(
    'si_abc123xyz', // ← Stripe uses this to find the customer
    { quantity: 5 },
);

// 4. Stripe's internal lookup:
//    si_abc123xyz → finds subscription → finds customer → charges customer
```

**Important:** The `subscription_item_id` is unique per subscription. Each tenant has their own subscription, so each tenant has their own `subscription_item_id`. That's how Stripe knows which tenant to charge!

---

## Step 7: Environment Variables

Add these to your backend `.env` file:

```env
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_xxxxx  # Use sk_live_xxxxx in production
STRIPE_PUBLISHABLE_KEY=pk_test_xxxxx  # Use pk_live_xxxxx in production
STRIPE_WEBHOOK_SECRET=whsec_xxxxx  # Webhook signing secret
STRIPE_CURRENCY=BRL

# Frontend (if needed)
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_xxxxx
```

---

## Step 7.5: Customizado Plan Billing Implementation

### How Stripe Identifies Which Tenant to Charge

**The Connection Chain:**

```
Your Tenant → Stripe Customer → Stripe Subscription → Subscription Item → Usage Report
```

Here's how it works:

1. **Tenant → Stripe Customer** (One-to-One)

    - Each tenant has a `stripe_customer_id` in your database
    - This links your tenant to a Stripe Customer

2. **Stripe Customer → Stripe Subscription** (One-to-Many, but usually one active)

    - Each subscription belongs to a customer
    - You store `stripe_subscription_id` in your `tenant_subscription` table

3. **Stripe Subscription → Subscription Items** (One-to-Many)

    - Each price in a subscription becomes a "subscription item"
    - For Customizado: You get 2 items (base price + metered price)
    - Each item has a unique `subscription_item_id`

4. **Subscription Item ID → Usage Report**
    - When reporting usage, you use the `subscription_item_id` for the metered price
    - Stripe knows which subscription (and customer) to charge based on this ID

**Example Flow:**

```typescript
// 1. Create Stripe Customer (one time per tenant)
const customer = await stripe.customers.create({
    email: tenant.adminEmail,
    name: tenant.name,
    metadata: { tenantId: tenant.id.toString() },
});
// Save: tenant.stripeCustomerId = customer.id

// 2. Create Subscription (when tenant subscribes)
const subscription = await stripe.subscriptions.create({
    customer: customer.id, // Links to tenant via stripeCustomerId
    items: [{ price: plan.stripePriceIdMonthly }, { price: plan.stripePriceIdPerUser }],
    metadata: { tenantId: tenant.id.toString() },
});
// Save: tenantSubscription.stripeSubscriptionId = subscription.id

// 3. Get Subscription Items
const baseItem = subscription.items.data[0]; // Base price item
const perUserItem = subscription.items.data[1]; // Metered price item
// Save:
//   tenantSubscription.stripeSubscriptionItemIdBase = baseItem.id
//   tenantSubscription.stripeSubscriptionItemIdPerUser = perUserItem.id

// 4. Report Usage (when user count changes)
await stripe.subscriptionItems.createUsageRecord(
    perUserItem.id, // THIS is how Stripe knows which tenant!
    { quantity: additionalUsers },
);
// Stripe follows: subscription_item → subscription → customer → your tenant
```

**Key Point:** The `subscription_item_id` is the link! When you report usage using `stripeSubscriptionItemIdPerUser`, Stripe:

1. Looks up the subscription item
2. Finds the subscription it belongs to
3. Finds the customer who owns that subscription
4. Charges that customer

### How Metered Billing Works

For the Customizado plan, Stripe will:

1. Charge the base price (R$ 399.00) every month
2. Add R$ 15.00 for each user over 30
3. Calculate the total at the end of each billing period

### Implementation Flow

#### 1. Creating a Customizado Subscription

```typescript
// When a tenant subscribes to Customizado plan
const subscription = await stripe.subscriptions.create({
    customer: stripeCustomerId,
    items: [
        { price: plan.stripePriceIdMonthly }, // Base R$ 399.00
        { price: plan.stripePriceIdPerUser }, // Metered R$ 15.00/user
    ],
    metadata: {
        tenantId: tenant.id,
        planSlug: 'customizado',
        includedUsers: '30', // First 30 users included
    },
});

// Save subscription item IDs
const baseItem = subscription.items.data.find(
    (item) => item.price.id === plan.stripePriceIdMonthly,
);
const perUserItem = subscription.items.data.find(
    (item) => item.price.id === plan.stripePriceIdPerUser,
);

// Store in database
await tenantSubscriptionRepository.update(tenantSubscriptionId, {
    stripeSubscriptionId: subscription.id,
    stripeSubscriptionItemIdBase: baseItem.id,
    stripeSubscriptionItemIdPerUser: perUserItem.id,
});
```

#### 2. Reporting Usage (When User Count Changes)

```typescript
// When tenant adds/removes users
async function updateCustomizadoPlanUsage(tenantId: number, currentUserCount: number) {
    // 1. Get tenant's subscription from YOUR database
    const tenantSubscription = await getTenantSubscription(tenantId);

    if (tenantSubscription.planSlug !== 'customizado') {
        return; // Only for Customizado plan
    }

    // 2. Calculate additional users (users over 30)
    const additionalUsers = Math.max(0, currentUserCount - 30);

    // 3. Report usage to Stripe using the subscription_item_id
    //    This ID is unique to this tenant's subscription and links:
    //    subscription_item_id → subscription → customer → tenant
    await stripe.subscriptionItems.createUsageRecord(
        tenantSubscription.stripeSubscriptionItemIdPerUser, // ← This links to the tenant!
        {
            quantity: additionalUsers,
            timestamp: Math.floor(Date.now() / 1000),
            action: 'set', // 'set' replaces previous usage, 'increment' adds to it
        },
    );

    // 4. Update your database
    await tenantSubscriptionRepository.update(tenantSubscription.id, {
        currentUserCount: currentUserCount,
        additionalUsersCount: additionalUsers,
    });
}
```

**How Stripe Knows Which Tenant:**

-   `stripeSubscriptionItemIdPerUser` is stored in YOUR database, linked to the tenant
-   When you call `createUsageRecord(subscriptionItemId, ...)`, Stripe:
    1. Looks up the subscription item by ID
    2. Finds the subscription it belongs to
    3. Finds the customer who owns that subscription
    4. Charges that customer
-   The `subscription_item_id` is the unique identifier that connects everything!

#### 3. Monthly Usage Reporting (Alternative Approach)

If you prefer to report usage at the end of each billing period:

```typescript
// Run this monthly (via cron job or scheduled task)
async function reportMonthlyUsage() {
    const customizadoSubscriptions = await getActiveCustomizadoSubscriptions();

    for (const subscription of customizadoSubscriptions) {
        const tenant = await getTenant(subscription.tenantId);
        const currentUserCount = await getUserCount(tenant.id);
        const additionalUsers = Math.max(0, currentUserCount - 30);

        await stripe.subscriptionItems.createUsageRecord(
            subscription.stripeSubscriptionItemIdPerUser,
            {
                quantity: additionalUsers,
                timestamp: Math.floor(Date.now() / 1000),
            },
        );
    }
}
```

#### 4. Handling Webhooks for Customizado Plan

```typescript
// In your webhook handler
if (event.type === 'invoice.created') {
    const invoice = event.data.object;

    if (invoice.subscription) {
        const subscription = await stripe.subscriptions.retrieve(invoice.subscription);

        // Check if it's a Customizado plan
        if (subscription.metadata.planSlug === 'customizado') {
            // The invoice will include:
            // - Base charge: R$ 399.00
            // - Usage charge: R$ 15.00 × (users over 30)
            // Total is calculated automatically by Stripe
        }
    }
}
```

### Important Considerations

1. **Usage Reporting Timing**:

    - **Option A**: Report immediately when user count changes (recommended)
    - **Option B**: Report at end of billing period (simpler, but less accurate)

2. **Usage Action**:

    - Use `action: 'set'` to replace previous usage (recommended)
    - Use `action: 'increment'` to add to previous usage (be careful with this)

3. **Billing Period**:

    - Stripe calculates usage at the end of each billing period
    - The invoice will show: Base price + (Additional users × R$ 15.00)

4. **User Count Tracking**:

    - Track user count in your database
    - Update Stripe usage when count changes
    - Consider adding a `lastUsageReportDate` field

5. **Edge Cases**:
    - What if user count goes below 30? (Usage should be 0)
    - What if user count increases during the month? (Report new total)
    - What if subscription is cancelled? (Stop reporting usage)

### Example: User Count Changes

```
Day 1: Tenant has 25 users → Usage: 0 (below 30)
Day 10: Tenant adds 10 users → Now 35 users → Usage: 5 (35 - 30)
Day 20: Tenant adds 5 more users → Now 40 users → Usage: 10 (40 - 30)
End of month: Stripe bills R$ 399.00 + (10 × R$ 15.00) = R$ 549.00
```

---

## Step 8: Recommended Stripe Features

### 8.1 Customer Portal

Enable Stripe Customer Portal for self-service subscription management:

1. Navigate to **Settings** → **Billing** → **Customer portal**
2. Enable the portal
3. Configure what customers can do:
    - ✅ Update payment method
    - ✅ Cancel subscription
    - ✅ Update billing information
    - ✅ View invoices

### 8.2 Tax Configuration

If you need to collect taxes:

1. Navigate to **Settings** → **Tax**
2. Configure tax rates for Brazil (if applicable)
3. Enable automatic tax calculation

### 8.3 Invoice Settings

1. Navigate to **Settings** → **Branding**
2. Upload your logo
3. Customize invoice appearance
4. Configure invoice email templates

---

## Step 9: Testing Checklist

Before going live, test the following:

-   [ ] Create a test subscription (monthly)
-   [ ] Create a test subscription (yearly)
-   [ ] Test subscription upgrade
-   [ ] Test subscription downgrade
-   [ ] Test subscription cancellation
-   [ ] Test payment method update
-   [ ] Test failed payment handling
-   [ ] Test webhook delivery
-   [ ] Test trial period (if applicable)
-   [ ] Test invoice generation

---

## Step 10: Going Live

1. **Complete testing** in Test Mode
2. **Switch to Live Mode** in Stripe Dashboard
3. **Update environment variables** with live keys
4. **Update webhook endpoint** to production URL
5. **Test with a real payment** (small amount)
6. **Monitor webhook logs** for the first few days

---

## Additional Resources

-   [Stripe API Documentation](https://stripe.com/docs/api)
-   [Stripe Subscriptions Guide](https://stripe.com/docs/billing/subscriptions/overview)
-   [Stripe Webhooks Guide](https://stripe.com/docs/webhooks)
-   [Stripe Testing Guide](https://stripe.com/docs/testing)

---

## Support

If you encounter issues:

1. Check Stripe Dashboard → **Developers** → **Logs**
2. Review webhook delivery attempts
3. Check your application logs
4. Consult Stripe documentation
5. Contact Stripe support if needed

---

## Notes

-   **Currency**: All prices are in BRL (Brazilian Real)
-   **Billing**: Recurring subscriptions (monthly/yearly)
-   **Custom Plan**: May require manual invoice creation or custom pricing setup
-   **Trial Periods**: Configure in your application logic, not in Stripe prices
-   **Metadata**: Use metadata to link Stripe objects to your database records
