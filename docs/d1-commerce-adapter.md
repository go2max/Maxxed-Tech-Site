# D1 Commerce Adapter

This branch adds the first database adapter layer for the commerce system.

## Added

- Numbered admin migrations under `admin/db/migrations/` so the existing migration sequence validator has concrete files to inspect.
- Commerce migration for products, plans, customers, businesses, seats, subscriptions, entitlements, usage events, webhook events, and capacity tables.
- `admin/src/d1-commerce-adapter.mjs` with functions for:
  - customer upsert
  - business account upsert
  - webhook event recording with duplicate detection
  - subscription plus entitlement upsert
  - usage event recording with duplicate detection
  - entitlement lookup by customer, business, and entitlement key
- `admin/tests/d1-commerce-adapter.test.mjs` with a mock D1 binding.

## Current safety limits

- Checkout is still not live.
- Webhook verification is still not live.
- The adapter is ready for a D1 binding, but deployment binding names still need final environment configuration.
- The worker can use this adapter when `DB` or `COMMERCE_DB` is present.

## Suggested local checks

Run these from the repo root:

```bash
node admin/tests/d1-commerce-adapter.test.mjs
node scripts/admin-d1-migrate.mjs
npm run commerce:persistence:check
npm run commerce:stripe:check
```

## Next pass

- Add the real Stripe test-mode checkout session call.
- Add webhook signature verification.
- Add a small admin view for webhook events and failed processing.
- Add seeded commerce groups, products, plans, and usage meters into D1.
