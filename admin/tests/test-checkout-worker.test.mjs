import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { handleCommerceRequest } from '../api/commerce-worker.mjs';

const env = {
  STRIPE_SECRET_KEY: 'sk_test_123',
  STRIPE_WEBHOOK_SECRET: 'whsec_123',
  PUBLIC_SITE_URL: 'https://techmaxxed.com',
  TEST_FETCH: async (url, options) => {
    assert.equal(url, 'https://api.stripe.com/v1/checkout/sessions');
    assert.equal(options.method, 'POST');
    return new Response(JSON.stringify({ id: 'cs_test_worker', url: 'https://checkout.stripe.test/worker' }), { status: 200, headers: { 'content-type': 'application/json' } });
  }
};

let response = await handleCommerceRequest(new Request('https://admin.techmaxxed.com/api/commerce/test-checkout-session', {
  method: 'POST',
  body: JSON.stringify({ planSlug: 'plugin-starter', productSlug: 'post-purge-pro', customerEmail: 'tester@example.com' })
}), env);
let body = await response.json();
assert.equal(response.status, 200);
assert.equal(body.ok, true);
assert.equal(body.sessionId, 'cs_test_worker');

response = await handleCommerceRequest(new Request('https://admin.techmaxxed.com/api/commerce/test-checkout-session', {
  method: 'POST',
  body: JSON.stringify({ planSlug: 'plugin-starter', productSlug: 'post-purge-pro' })
}), { ...env, STRIPE_SECRET_KEY: 'sk_live_123' });
body = await response.json();
assert.equal(response.status, 403);
assert.equal(body.ok, false);

const payload = JSON.stringify({ id: 'evt_worker' });
const timestamp = 1800000000;
const signature = createHmac('sha256', env.STRIPE_WEBHOOK_SECRET).update(`${timestamp}.${payload}`).digest('hex');
response = await handleCommerceRequest(new Request('https://admin.techmaxxed.com/api/commerce/verify-webhook-signature', {
  method: 'POST',
  body: JSON.stringify({ payload, header: `t=${timestamp},v1=${signature}`, nowSeconds: timestamp })
}), env);
body = await response.json();
assert.equal(body.result.ok, true);

console.log('test checkout worker tests passed');
