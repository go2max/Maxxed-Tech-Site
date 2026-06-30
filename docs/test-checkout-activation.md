# Test Checkout Activation

This branch adds the first real provider-call boundary for checkout while keeping production/live payment redirects disabled.

## Added

- `admin/src/test-checkout-client.mjs`
  - Checks that payment env is configured.
  - Blocks live secret keys.
  - Converts checkout drafts into provider form payloads.
  - Creates test-mode checkout sessions through a fetch boundary.
  - Verifies webhook signatures with HMAC and timing-safe comparison.

- `admin/api/commerce-worker.mjs`
  - Adds `/api/commerce/test-checkout-session`.
  - Adds `/api/commerce/verify-webhook-signature`.
  - Keeps `/api/commerce/checkout-session` as a non-redirecting draft route.

- Tests
  - `admin/tests/test-checkout-client.test.mjs`
  - `admin/tests/test-checkout-worker.test.mjs`

## Safety rules

- Live secret keys are rejected.
- Missing env returns a non-success response.
- Static `/order/` page still does not redirect directly to payment.
- Webhook verification is available, but production webhook mutation still needs the verified webhook endpoint pass.

## Suggested local checks

```bash
node admin/tests/test-checkout-client.test.mjs
node admin/tests/test-checkout-worker.test.mjs
node admin/tests/stripe-entitlements.test.mjs
node admin/tests/commerce-worker.test.mjs
npm run check
```

## Required test env before trying the route

- `STRIPE_SECRET_KEY` with a test-mode key.
- `STRIPE_WEBHOOK_SECRET` with a test webhook signing secret.
- `PUBLIC_SITE_URL`, such as `https://techmaxxed.com`.

## Next pass

1. Add a verified webhook endpoint that reads the raw request body.
2. Verify signature before parsing JSON.
3. Persist verified webhook events through the D1 adapter.
4. Add admin event status view for processed, ignored, failed, and duplicate events.
5. Add checkout button flow from `/order/` to the test checkout endpoint once the worker route is deployed.
