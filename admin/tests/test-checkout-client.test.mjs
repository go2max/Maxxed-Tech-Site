import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { assertTestCheckoutReady, createTestCheckoutSession, draftToProviderForm, verifyWebhookSignature } from '../src/test-checkout-client.mjs';
import { createCheckoutSessionDraft } from '../src/stripe-scaffold.mjs';

const testEnv = { STRIPE_SECRET_KEY: 'sk_test_123', STRIPE_WEBHOOK_SECRET: 'whsec_123', PUBLIC_SITE_URL: 'https://techmaxxed.com' };
assert.equal(assertTestCheckoutReady(testEnv).ok, true);
assert.equal(assertTestCheckoutReady({ ...testEnv, STRIPE_SECRET_KEY: 'sk_live_123' }).ok, false);
assert.equal(assertTestCheckoutReady({}).status, 503);

const draft = createCheckoutSessionDraft({ planSlug: 'plugin-starter', productSlug: 'post-purge-pro', interval: 'monthly', customerEmail: 'tester@example.com' }, testEnv);
const form = draftToProviderForm(draft);
assert.equal(form.get('mode'), 'subscription');
assert.equal(form.get('line_items[0][price_lookup_key]'), 'maxxed_plugin_starter_monthly');
assert.ok(form.get('metadata').includes('plugin.post_purge_pro'));

let called = false;
const result = await createTestCheckoutSession({ planSlug: 'plugin-starter', productSlug: 'post-purge-pro', customerEmail: 'tester@example.com' }, testEnv, async (url, options) => {
  called = true;
  assert.equal(url, 'https://api.stripe.com/v1/checkout/sessions');
  assert.equal(options.method, 'POST');
  assert.equal(options.headers.authorization, 'Bearer sk_test_123');
  assert.ok(String(options.body).includes('maxxed_plugin_starter_monthly'));
  return new Response(JSON.stringify({ id: 'cs_test_123', url: 'https://checkout.stripe.test/session' }), { status: 200, headers: { 'content-type': 'application/json' } });
});
assert.equal(called, true);
assert.equal(result.ok, true);
assert.equal(result.sessionId, 'cs_test_123');
assert.equal(result.checkoutUrl, 'https://checkout.stripe.test/session');

const blocked = await createTestCheckoutSession({ planSlug: 'plugin-starter', productSlug: 'post-purge-pro' }, { ...testEnv, STRIPE_SECRET_KEY: 'sk_live_123' }, async () => { throw new Error('must not call provider'); });
assert.equal(blocked.ok, false);
assert.equal(blocked.status, 403);

const payload = JSON.stringify({ id: 'evt_123' });
const timestamp = 1800000000;
const signature = createHmac('sha256', testEnv.STRIPE_WEBHOOK_SECRET).update(`${timestamp}.${payload}`).digest('hex');
const verified = verifyWebhookSignature({ payload, header: `t=${timestamp},v1=${signature}`, secret: testEnv.STRIPE_WEBHOOK_SECRET, nowSeconds: timestamp });
assert.equal(verified.ok, true);
const bad = verifyWebhookSignature({ payload, header: `t=${timestamp},v1=deadbeef`, secret: testEnv.STRIPE_WEBHOOK_SECRET, nowSeconds: timestamp });
assert.equal(bad.ok, false);

console.log('test checkout client tests passed');
