import assert from 'node:assert/strict';
import { handleCommerceRequest } from '../api/commerce-worker.mjs';

const env = { STRIPE_SECRET_KEY: 'sk_test_123', STRIPE_WEBHOOK_SECRET: 'whsec_123', PUBLIC_SITE_URL: 'https://techmaxxed.com' };

let response = await handleCommerceRequest(new Request('https://admin.techmaxxed.com/api/commerce/health'), env);
assert.equal(response.status, 200);
let body = await response.json();
assert.equal(body.ok, true);
assert.equal(body.stripe.ready, true);

response = await handleCommerceRequest(new Request('https://admin.techmaxxed.com/api/commerce/checkout-session', {
  method: 'POST',
  body: JSON.stringify({ planSlug: 'plugin-starter', productSlug: 'post-purge-pro', interval: 'monthly', customerEmail: 'tester@example.com' })
}), env);
body = await response.json();
assert.equal(body.ok, true);
assert.equal(body.draft.request.metadata.entitlement_key, 'plugin.post_purge_pro');

response = await handleCommerceRequest(new Request('https://admin.techmaxxed.com/api/commerce/usage-check', {
  method: 'POST',
  body: JSON.stringify({ planSlug: 'business-pro', used: 1000, requested: 1 })
}), env);
body = await response.json();
assert.equal(body.result.decision, 'warn');

response = await handleCommerceRequest(new Request('https://admin.techmaxxed.com/api/commerce/evaluate-entitlement', {
  method: 'POST',
  body: JSON.stringify({ entitlement: { state: 'restricted', entitlementKey: 'plugin.post_purge_pro' } })
}), env);
body = await response.json();
assert.equal(body.result.decision, 'restrict');

response = await handleCommerceRequest(new Request('https://admin.techmaxxed.com/api/commerce/checkout-session', {
  method: 'POST',
  body: JSON.stringify({ planSlug: 'plugin-starter', productSlug: 'post-purge-pro' })
}), {});
assert.equal(response.status, 503);
body = await response.json();
assert.equal(body.ok, false);

console.log('commerce worker scaffold tests passed');
