import assert from 'node:assert/strict';
import { handleCommerceRequest } from '../api/commerce-worker.mjs';

const env = { STRIPE_SECRET_KEY: 'sk_test_123', STRIPE_WEBHOOK_SECRET: 'whsec_123', PUBLIC_SITE_URL: 'https://techmaxxed.com' };

let response = await handleCommerceRequest(new Request('https://admin.techmaxxed.com/api/commerce/health'), env);
assert.equal(response.status, 200);
let body = await response.json();
assert.equal(body.ok, true);
assert.equal(body.stripe.ready, true);
assert.equal(body.persistence, 'memory_scaffold');

response = await handleCommerceRequest(new Request('https://admin.techmaxxed.com/api/commerce/checkout-session', {
  method: 'POST',
  body: JSON.stringify({ planSlug: 'plugin-starter', productSlug: 'post-purge-pro', interval: 'monthly', customerEmail: 'tester@example.com' })
}), env);
body = await response.json();
assert.equal(body.ok, true);
assert.equal(body.draft.request.metadata.entitlement_key, 'plugin.post_purge_pro');

response = await handleCommerceRequest(new Request('https://admin.techmaxxed.com/api/commerce/usage-check', {
  method: 'POST',
  body: JSON.stringify({ planSlug: 'business-pro', meterKey: 'actions', businessId: 'biz_1', usedBefore: 1000, quantity: 1, idempotencyKey: 'usage_1' })
}), env);
body = await response.json();
assert.equal(body.result.decision, 'warn');
assert.equal(body.stateSummary.usageEvents, 1);

response = await handleCommerceRequest(new Request('https://admin.techmaxxed.com/api/commerce/usage-check', {
  method: 'POST',
  body: JSON.stringify({ planSlug: 'business-pro', meterKey: 'actions', businessId: 'biz_1', usedBefore: 1000, quantity: 1, idempotencyKey: 'usage_1' })
}), env);
body = await response.json();
assert.equal(body.result.duplicate, true);
assert.equal(body.stateSummary.usageEvents, 1);

response = await handleCommerceRequest(new Request('https://admin.techmaxxed.com/api/commerce/evaluate-entitlement', {
  method: 'POST',
  body: JSON.stringify({ entitlement: { state: 'restricted', entitlementKey: 'plugin.post_purge_pro' } })
}), env);
body = await response.json();
assert.equal(body.result.decision, 'restrict');

response = await handleCommerceRequest(new Request('https://admin.techmaxxed.com/api/commerce/webhook-preview', {
  method: 'POST',
  body: JSON.stringify({ id: 'evt_1', type: 'customer.subscription.updated', data: { object: { id: 'sub_1', customer: 'cus_1', status: 'active', metadata: { plan_slug: 'plugin-starter', product_slug: 'post-purge-pro' } } } })
}), env);
body = await response.json();
assert.equal(body.result.handled, true);
assert.equal(body.stateSummary.subscriptions, 1);
assert.equal(body.stateSummary.entitlements, 1);
assert.equal(body.stateSummary.webhookEvents, 1);

response = await handleCommerceRequest(new Request('https://admin.techmaxxed.com/api/commerce/webhook-preview', {
  method: 'POST',
  body: JSON.stringify({ id: 'evt_1', type: 'customer.subscription.updated', data: { object: { id: 'sub_1', customer: 'cus_1', status: 'active', metadata: { plan_slug: 'plugin-starter', product_slug: 'post-purge-pro' } } } })
}), env);
body = await response.json();
assert.equal(body.duplicate, true);
assert.equal(body.stateSummary.webhookEvents, 1);

response = await handleCommerceRequest(new Request('https://admin.techmaxxed.com/api/commerce/checkout-session', {
  method: 'POST',
  body: JSON.stringify({ planSlug: 'plugin-starter', productSlug: 'post-purge-pro' })
}), {});
assert.equal(response.status, 503);
body = await response.json();
assert.equal(body.ok, false);

console.log('commerce worker scaffold tests passed');
