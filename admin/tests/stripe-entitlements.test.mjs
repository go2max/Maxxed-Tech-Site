import assert from 'node:assert/strict';
import { businessSeatDecision, entitlementFromSubscription, evaluateEntitlement, usageDecision } from '../src/entitlements.mjs';
import { checkoutMetadata, createCheckoutSessionDraft, entitlementUpdateFromStripeEvent, priceLookupKey, stripeConfigStatus, webhookSafetyChecklist } from '../src/stripe-scaffold.mjs';

assert.equal(priceLookupKey('plugin-starter', 'monthly'), 'maxxed_plugin_starter_monthly');
assert.equal(priceLookupKey('business-pro', 'annual'), 'maxxed_business_pro_annual');
assert.throws(() => priceLookupKey('business-pro', 'weekly'), /Unsupported billing interval/);

const metadata = checkoutMetadata({ planSlug: 'plugin-starter', productSlug: 'post-purge-pro', customerEmail: 'tester@example.com' });
assert.equal(metadata.entitlement_key, 'plugin.post_purge_pro');
assert.equal(metadata.source, 'techmaxxed_website');

const missingConfig = stripeConfigStatus({});
assert.equal(missingConfig.configured, false);
assert.ok(missingConfig.missing.includes('STRIPE_SECRET_KEY'));

const testConfig = stripeConfigStatus({ STRIPE_SECRET_KEY: 'sk_test_123', STRIPE_WEBHOOK_SECRET: 'whsec_123', PUBLIC_SITE_URL: 'https://techmaxxed.com' });
assert.equal(testConfig.mode, 'test');
assert.equal(testConfig.safeForLiveCheckout, true);

const draft = createCheckoutSessionDraft({ planSlug: 'plugin-starter', productSlug: 'post-purge-pro', interval: 'monthly', customerEmail: 'tester@example.com' }, { STRIPE_SECRET_KEY: 'sk_test_123', STRIPE_WEBHOOK_SECRET: 'whsec_123', PUBLIC_SITE_URL: 'https://techmaxxed.com' });
assert.equal(draft.enabled, true);
assert.equal(draft.request.mode, 'subscription');
assert.equal(draft.request.line_items[0].price_lookup_key, 'maxxed_plugin_starter_monthly');
assert.equal(draft.request.metadata.entitlement_key, 'plugin.post_purge_pro');

const entitlement = entitlementFromSubscription({ subscriptionId: 'sub_123', customerId: 'cus_123', productSlug: 'post-purge-pro', state: 'active' });
assert.equal(entitlement.entitlementKey, 'plugin.post_purge_pro');
assert.equal(evaluateEntitlement(entitlement).decision, 'allow');
assert.equal(evaluateEntitlement({ ...entitlement, state: 'restricted' }).decision, 'restrict');
assert.equal(evaluateEntitlement(null).decision, 'restrict');

const usageAllowed = usageDecision({ planSlug: 'plugin-starter', used: 10, requested: 5 });
assert.equal(usageAllowed.decision, 'allow');
const usageRestricted = usageDecision({ planSlug: 'plugin-starter', used: 250, requested: 1 });
assert.equal(usageRestricted.decision, 'restrict');
const businessOverage = usageDecision({ planSlug: 'business-pro', used: 1000, requested: 1 });
assert.equal(businessOverage.decision, 'warn');
const seatOverage = businessSeatDecision({ planSlug: 'business-pro', activeSeats: 3, requestedSeats: 1 });
assert.equal(seatOverage.decision, 'warn');

const eventResult = entitlementUpdateFromStripeEvent({
  id: 'evt_123',
  type: 'customer.subscription.updated',
  data: {
    object: {
      id: 'sub_123',
      customer: 'cus_123',
      status: 'past_due',
      current_period_end: 1790000000,
      metadata: {
        plan_slug: 'plugin-starter',
        product_slug: 'post-purge-pro'
      }
    }
  }
});
assert.equal(eventResult.handled, true);
assert.equal(eventResult.state, 'past_due');
assert.equal(eventResult.entitlement.policy.decision, 'warn');

const checklist = webhookSafetyChecklist({ STRIPE_SECRET_KEY: 'sk_live_123', STRIPE_WEBHOOK_SECRET: 'whsec_123', PUBLIC_SITE_URL: 'https://techmaxxed.com' });
assert.equal(checklist.ready, false);
assert.equal(checklist.checks.find((check) => check.key === 'test_mode_only').ok, false);

console.log('stripe entitlement scaffold tests passed');
