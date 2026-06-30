# Verified Event Ingestion

This branch adds the safer event ingestion path for commerce subscription updates.

## Added

- `admin/src/verified-event-ingest.mjs`
  - Reads the raw request body.
  - Verifies the signature before JSON parsing.
  - Parses the event only after verification succeeds.
  - Routes verified events into D1 when `DB` or `COMMERCE_DB` is configured.
  - Falls back to the in-memory scaffold when no database binding exists.

- `admin/api/commerce-worker.mjs`
  - Adds `POST /api/commerce/verified-event`.
  - Keeps existing preview route separate from verified ingestion.

## Safety behavior

- Missing or invalid signature returns a non-success response.
- Invalid JSON returns a non-success response after signature verification.
- Duplicate event IDs are handled through existing webhook idempotency logic.
- Unsupported event types are recorded or ignored instead of mutating entitlements.

## Manual checks later

Run these from the repo root when at a computer:

```bash
node admin/tests/test-checkout-client.test.mjs
node admin/tests/test-checkout-worker.test.mjs
node admin/tests/commerce-store.test.mjs
node admin/tests/d1-commerce-adapter.test.mjs
node admin/tests/commerce-worker.test.mjs
npm run check
```

## Next pass

1. Add an admin webhook event status panel.
2. Add failed/ignored/duplicate event counts to the admin dashboard.
3. Add seed records for commerce groups, products, plans, and meters.
4. Wire `/order/` to the test checkout route only after the worker route is deployed and test env is configured.
