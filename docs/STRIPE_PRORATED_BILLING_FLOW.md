# Stripe Prorated Billing Flow - Complete Example

## Overview

This document explains how Stripe handles prorated billing for yearly subscriptions with metered per-user pricing in the Tasky system. All proration calculations are handled automatically by Stripe.

## How Proration Works

When using **metered pricing** with yearly subscriptions, Stripe automatically:

-   Calculates prorated charges when usage increases mid-cycle
-   Applies credits when usage decreases mid-cycle
-   Charges the full amount at renewal based on current usage

### Key Mechanism: `action: 'set'`

```typescript
await this.stripeService.reportUsage(
    subscription.stripeSubscriptionItemIdPerUser,
    additionalUsers,
    'set', // Tells Stripe the new total quantity
);
```

**What happens:**

1. Stripe compares new quantity to previous quantity
2. If increased → Prorates and charges immediately
3. If decreased → Credits on next invoice
4. At renewal → Charges full year at current quantity

---

## Complete Flow Example

### Scenario: Customizado Plan (Yearly Billing)

**Plan Details:**

-   Base Price: R$ 3,800/year
-   Included Users: 10
-   Per-User Price: R$ 180/year (R$ 15/month equivalent)
-   Billing Interval: Yearly

---

## Timeline

### **January 1, 2025: Initial Subscription**

**Customer Action:**

```bash
POST /tenant-subscriptions/checkout
{
  "planSlug": "customizado",
  "billingInterval": "yearly"
}
```

**System State:**

-   Current active users: 15
-   Included users: 10
-   Additional users: 5

**Stripe Subscription Created:**

```json
{
    "items": [
        {
            "price": "price_yearly_base_3800",
            "quantity": 1
        },
        {
            "price": "price_yearly_per_user_180",
            "quantity": 5
        }
    ]
}
```

**Immediate Charge:**

```
Base Price:        R$ 3,800.00
Per-User (5 × 180): R$   900.00
─────────────────────────────
Total:             R$ 4,700.00
```

**Invoice Details:**

-   Invoice Date: Jan 1, 2025
-   Period: Jan 1, 2025 - Dec 31, 2025
-   Status: Paid

---

### **March 15, 2025: Add 2 Users (Mid-Year)**

**Customer Action:**

```bash
# Admin creates first user
POST /users
{
  "email": "user16@example.com",
  "firstName": "User",
  "lastName": "Sixteen"
}

# Admin creates second user
POST /users
{
  "email": "user17@example.com",
  "firstName": "User",
  "lastName": "Seventeen"
}
```

**Automatic System Response:**

1. User created successfully
2. `syncUsageToStripe()` called automatically
3. New user count calculated: 17 active users
4. Additional users: 7 (17 - 10 included)

**Usage Report to Stripe:**

```typescript
reportUsage(
    subscriptionItemId,
    7, // New quantity (was 5, now 7)
    'set', // Replace previous quantity
);
```

**Stripe Proration Calculation:**

```
Previous Quantity: 5 users
New Quantity: 7 users
Difference: +2 users

Subscription Period: Jan 1, 2025 - Dec 31, 2025 (365 days)
Current Date: March 15, 2025
Days Elapsed: 73 days
Days Remaining: 292 days

Proration Formula:
Price per User × Quantity × (Days Remaining / Days in Period)
R$ 180 × 2 × (292 / 365) = R$ 287.67

Rounded: R$ 287.67
```

**Immediate Charge:**

```
Prorated Per-User (2 users): R$ 287.67
```

**Invoice Details:**

-   Invoice Date: Mar 15, 2025
-   Description: "Additional users (prorated)"
-   Line Item: "2 × Per-User License (Mar 15, 2025 - Dec 31, 2025)"
-   Status: Paid

**Updated Subscription State:**

-   Base quantity: 1
-   Per-user quantity: 7 (updated from 5)

---

### **July 1, 2025: Remove 1 User (Mid-Year)**

**Customer Action:**

```bash
PATCH /users/abc-123-def
{
  "isActive": false
}
```

**Automatic System Response:**

1. User deactivated successfully
2. `syncUsageToStripe()` called automatically
3. New user count calculated: 16 active users
4. Additional users: 6 (16 - 10 included)

**Usage Report to Stripe:**

```typescript
reportUsage(
    subscriptionItemId,
    6, // New quantity (was 7, now 6)
    'set',
);
```

**Stripe Credit Calculation:**

```
Previous Quantity: 7 users
New Quantity: 6 users
Difference: -1 user

Current Date: July 1, 2025
Days Remaining: 184 days

Credit Formula:
Price per User × Quantity × (Days Remaining / Days in Period)
R$ 180 × 1 × (184 / 365) = R$ 90.74

Rounded: R$ 90.74
```

**Credit Applied:**

```
Credit for Unused Period: -R$ 90.74
```

**Invoice Details:**

-   Invoice Date: July 1, 2025
-   Description: "Credit for removed user (prorated)"
-   Line Item: "1 × Per-User License Credit (Jul 1, 2025 - Dec 31, 2025)"
-   Amount: -R$ 90.74
-   Status: Credit applied to account balance

**Updated Subscription State:**

-   Base quantity: 1
-   Per-user quantity: 6 (updated from 7)

---

### **October 10, 2025: Add 3 More Users**

**Customer Action:**

```bash
# Admin creates 3 users
POST /users (× 3)
```

**Automatic System Response:**

1. Users created successfully
2. `syncUsageToStripe()` called automatically
3. New user count: 19 active users
4. Additional users: 9 (19 - 10 included)

**Stripe Proration Calculation:**

```
Previous Quantity: 6 users
New Quantity: 9 users
Difference: +3 users

Current Date: October 10, 2025
Days Remaining: 83 days

Proration:
R$ 180 × 3 × (83 / 365) = R$ 122.63
```

**Immediate Charge:**

```
Prorated Per-User (3 users): R$ 122.63
```

**Updated Subscription State:**

-   Base quantity: 1
-   Per-user quantity: 9

---

### **January 1, 2026: Annual Renewal**

**Automatic Stripe Renewal:**

**Subscription State at Renewal:**

-   Base quantity: 1
-   Per-user quantity: 9
-   Account credit: -R$ 90.74 (from July removal)

**Renewal Charge Calculation:**

```
Base Price (1 year):           R$ 3,800.00
Per-User (9 × R$ 180):         R$ 1,620.00
Account Credit:                -R$    90.74
─────────────────────────────────────────
Total Charge:                  R$ 5,329.26
```

**Invoice Details:**

-   Invoice Date: Jan 1, 2026
-   Period: Jan 1, 2026 - Dec 31, 2026
-   Line Items:
    1. Base Subscription: R$ 3,800.00
    2. Per-User (9 users): R$ 1,620.00
    3. Account Credit: -R$ 90.74
-   Total: R$ 5,329.26
-   Status: Paid

**New Subscription Period:**

-   Start: Jan 1, 2026
-   End: Dec 31, 2026
-   Current per-user quantity: 9

---

## Summary of All Charges

### Year 1 (2025)

| Date             | Event                          | Charge          | Running Total |
| ---------------- | ------------------------------ | --------------- | ------------- |
| Jan 1            | Initial subscription (5 users) | R$ 4,700.00     | R$ 4,700.00   |
| Mar 15           | Add 2 users (prorated)         | R$ 287.67       | R$ 4,987.67   |
| Jul 1            | Remove 1 user (credit)         | -R$ 90.74       | R$ 4,896.93   |
| Oct 10           | Add 3 users (prorated)         | R$ 122.63       | R$ 5,019.56   |
| **Total Year 1** |                                | **R$ 5,019.56** |               |

### Year 2 Renewal (2026)

| Date  | Event                    | Charge      |
| ----- | ------------------------ | ----------- |
| Jan 1 | Annual renewal (9 users) | R$ 5,329.26 |

---

## Key Takeaways

### ✅ Automatic Proration

-   **No manual calculations needed** - Stripe handles everything
-   **Fair billing** - Customers only pay for what they use, when they use it
-   **Immediate charges** - Usage increases are charged right away
-   **Automatic credits** - Usage decreases generate credits

### ✅ Transparent Billing

-   **Clear invoices** - Each change creates a separate line item
-   **Detailed descriptions** - Customers see exactly what they're paying for
-   **Prorated periods** - Dates clearly shown on invoices

### ✅ Seamless Integration

-   **Automatic sync** - Usage updates when users are created/deactivated
-   **Fire-and-forget** - No manual intervention required
-   **Error resilient** - Sync failures don't break user operations

---

## Technical Implementation

### Automatic Usage Sync

**When users are created:**

```typescript
// user.service.ts
async create(accessProfile: AccessProfile, data: CreateUserDto) {
    const createdUser = await this.save(accessProfile, { ...data, roleId });

    // Automatically syncs to Stripe (non-blocking)
    this.syncUsageToStripe(accessProfile.tenantId);

    return createdUser;
}
```

**When users are deactivated:**

```typescript
// user.service.ts
async update(accessProfile: AccessProfile, id: number, data: UpdateUserDto) {
    const result = await super.update(accessProfile, id, updateData);

    // Syncs if isActive status changed
    if (data.isActive !== undefined) {
        this.syncUsageToStripe(accessProfile.tenantId);
    }

    return result;
}
```

### Usage Calculation

```typescript
// tenant-subscription.service.ts
async syncMeteredUsage(tenantId: number) {
    const currentUsers = await this.getCurrentUserCount(tenantId);
    const includedUsers = subscription.subscriptionPlan.maxUsers || 0;
    const additionalUsers = Math.max(0, currentUsers - includedUsers);

    // Stripe handles proration automatically
    await this.stripeService.reportUsage(
        subscription.stripeSubscriptionItemIdPerUser,
        additionalUsers,
        'set',  // Replace previous quantity
    );
}
```

---

## Configuration Requirements

### Stripe Setup

1. **Create Yearly Per-User Price:**

    ```
    Product: Additional User License
    Price: R$ 180/year
    Billing: Recurring
    Usage Type: Metered
    Aggregation: Last during period
    ```

2. **Configure Subscription Plan:**
    ```sql
    UPDATE subscription_plan
    SET stripePriceIdPerUserYearly = 'price_xxx_yearly_180'
    WHERE slug = 'customizado';
    ```

### Database Schema

```typescript
@Column({ length: 255, nullable: true })
stripePriceIdPerUserYearly: string; // For yearly billing

@Column({ length: 255, nullable: true })
stripePriceIdPerUserMonthly: string; // For monthly billing
```

---

## Customer Experience

### What Customers See

**Initial Subscription:**

-   Clear upfront cost
-   Breakdown of base + per-user charges
-   Annual commitment with predictable pricing

**Mid-Year Changes:**

-   Immediate invoice for additions (prorated)
-   Credits for removals (applied to balance)
-   Transparent line items showing exact periods

**Renewal:**

-   Full year charge based on current usage
-   Any accumulated credits applied
-   Predictable annual cost

### Benefits for Customers

1. **Flexibility** - Scale up/down as needed
2. **Fairness** - Only pay for what you use
3. **Transparency** - Clear, itemized billing
4. **Predictability** - Know costs before making changes

---

## Monitoring and Troubleshooting

### Check Current Usage

```bash
GET /tenant-subscriptions/summary
```

**Response:**

```json
{
    "billing": {
        "currentUsers": 19,
        "includedUsers": 10,
        "additionalUsers": 9,
        "basePlanCost": 3800,
        "additionalUsersCost": 1620,
        "totalCost": 5420
    }
}
```

### Manual Sync (if needed)

```bash
POST /tenant-subscriptions/sync-usage
```

**Response:**

```json
{
    "reportedUsers": 9,
    "currentUsers": 19,
    "includedUsers": 10
}
```

### Verify in Stripe Dashboard

1. Go to Stripe Dashboard
2. Navigate to Customers → [Customer Name]
3. Click on Subscription
4. View "Usage" tab
5. Check usage records and invoices

---

## Related Documentation

-   **AUTOMATIC_USAGE_SYNC.md** - How automatic sync works
-   **STRIPE_SETUP_GUIDE.md** - Initial Stripe configuration
-   **API Documentation** - Subscription endpoints
