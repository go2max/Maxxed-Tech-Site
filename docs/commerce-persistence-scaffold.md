# Commerce Persistence Scaffold

This pass adds deterministic persistence helpers and webhook idempotency behavior for the commerce system. It is still safe scaffolding: no live Stripe charge creation and no production lockouts.

## Added

- `admin/src/commerce-store.mjs`
  - Empty commerce state factory.
  - Customer upsert.
  - Business account upsert.
  - Subscription upsert.
  - Entitlement upsert.
  - Usage event recording with idempotency key support.
  - Stripe webhook event recording with duplicate detection.
  - Stripe event application into subscription and entitlement state.
  - Audit event generation for commerce mutations.

- `admin/db/commerce-schema.sql`
  - Adds `stripe_webhook_events` table.
  - Makes `usage_events.idempotency_key` unique.
  - Adds webhook processing state fields for received, processed, ignored, failed, and duplicate handling.

- `admin/api/commerce-worker.mjs`
  - Uses in-memory scaffold state when D1 is not connected.
  - Webhook preview now records webhook IDs and applies subscription/entitlement updates.
  - Usage check now records allowed or metered usage previews and blocks restricted usage.

- Tests
  - `admin/tests/commerce-store.test.mjs`
  - Updated `admin/tests/commerce-worker.test.mjs`
  - Updated `admin/tests/commerce.test.mjs`
  - Added `npm run commerce:persistence:check`

## Current safety limits

- Uses in-memory state for worker preview unless a future D1 adapter is connected.
- Does not verify real Stripe webhook signatures yet.
- Does not call Stripe checkout creation yet.
- Does not apply real customer lockout in apps/plugins yet.

## Next pass

1. Add D1 adapter methods for customer, business, subscription, entitlement, usage, and webhook tables.
2. Add migration wiring for `commerce-schema.sql`.
3. Replace in-memory worker state with D1-backed persistence.
4. Add verified Stripe webhook signature handling.
5. Add real Stripe test-mode checkout session creation.
6. Add admin page for webhook event status and failed processing.
