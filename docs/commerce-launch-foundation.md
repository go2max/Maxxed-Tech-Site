# Maxxed Commerce Launch Foundation

This branch starts the direct website purchase foundation without enabling live checkout.

## Decisions encoded

- Website purchase is the source of truth for subscriptions, demos, entitlements, access restriction, support, seats, and usage.
- Field products remain individually purchasable first because the buyer segments are niche and distinct.
- Plugin products can be sold individually, in small workflow bundles, or as part of business plans.
- Business products use per-business base pricing, included seats, add-on seats, included usage, and metered usage after allowance.
- Support routes to `support@techmaxxed.com`.
- Stripe is marked `not_connected` until checkout, webhooks, and entitlement state handling are wired.

## Added pieces

- `admin/src/commerce.mjs` defines commerce groups, products, plans, usage meters, entitlement states, and launch-server capacity risk.
- `admin/db/commerce-schema.sql` drafts tables for groups, products, plans, customers, businesses, seats, subscriptions, entitlements, usage, and capacity.
- `admin/tests/commerce.test.mjs` validates the important business rules.
- `public/pricing/` adds a customer pricing shell.
- `public/order/` adds a direct website ordering shell.
- `public/bundles/` documents standalone, bundle, and business plan purchase paths.
- `public/data/commerce-catalog.json` provides a simple public commerce data artifact.
- `admin/src/build-admin.mjs` now renders Commerce, Plans, and Capacity panels in the private admin build.

## Next implementation pass

1. Add real account creation/login flow.
2. Add Stripe products/prices in test mode.
3. Add checkout session creation.
4. Add Stripe customer portal links.
5. Add webhook handler for subscription state changes.
6. Convert webhook events into internal `subscriptions` and `entitlements` records.
7. Enforce states: `trialing`, `active`, `past_due`, `grace`, `restricted`, `canceled`, `expired`, `suspended`.
8. Add usage event recording and plan allowance checks.
9. Add customer-facing restricted/read-only mode for unpaid business accounts.
10. Move uploads, logs, and backups toward object storage before approving high-storage business plans.

## Capacity policy

The 50GB launch server should be treated as a control plane, not a permanent upload warehouse.

Emergency behavior should keep login, support, billing webhooks, and read access alive while disabling large writes such as uploads and exports.
