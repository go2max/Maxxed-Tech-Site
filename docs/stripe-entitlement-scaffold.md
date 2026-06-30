# Stripe and Entitlement Scaffold

This pass adds test-mode scaffolding only. It does not create live Stripe charges or enforce real customer lockouts.

## What exists

- `admin/src/entitlements.mjs`
  - Normalizes subscription states.
  - Converts subscription state into access decisions.
  - Evaluates whether a user should be allowed, warned, restricted, or denied.
  - Checks usage allowances for actions, seats, and storage.

- `admin/src/stripe-scaffold.mjs`
  - Defines required Stripe env names.
  - Builds checkout-session request drafts using plan/product metadata.
  - Maps Stripe subscription status into internal entitlement states.
  - Converts supported Stripe events into entitlement update previews.
  - Provides a webhook safety checklist that only reports ready for test mode.

- `admin/api/commerce-worker.mjs`
  - Adds route handlers for:
    - `/api/commerce/health`
    - `/api/commerce/checkout-session`
    - `/api/commerce/webhook-preview`
    - `/api/commerce/evaluate-entitlement`
    - `/api/commerce/usage-check`
  - These handlers return JSON scaffolds and do not call Stripe yet.

- `public/order/`
  - Adds checkout-preview buttons for plugin, bundle, business, and field purchase paths.
  - Buttons are intentionally not payment redirects.

## Required env before real Stripe test mode

- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `PUBLIC_SITE_URL`

Use test keys first. Do not enable live checkout until webhook verification, subscription syncing, and entitlement storage are tested.

## Access policy

- `trialing`: allow premium access.
- `active`: allow premium access.
- `past_due`: warn and continue grace behavior.
- `grace`: warn and continue temporary access.
- `restricted`: disable premium actions and keep read/export where possible.
- `canceled`: restrict after paid-through window.
- `expired`: demo/free mode only.
- `suspended`: deny until support review.

## Next pass

1. Add persistent D1 storage calls for customers, subscriptions, entitlements, and usage events.
2. Replace checkout draft output with real `stripe.checkout.sessions.create` call in test mode.
3. Verify Stripe webhook signatures.
4. Store webhook events idempotently.
5. Sync subscription status into internal entitlements.
6. Wire app/plugin feature gates to `/api/commerce/evaluate-entitlement`.
7. Wire usage-producing actions to `/api/commerce/usage-check` before the action and usage recording after success.
