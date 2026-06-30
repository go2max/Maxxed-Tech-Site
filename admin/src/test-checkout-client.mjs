import { createHmac, timingSafeEqual } from 'node:crypto';
import { createCheckoutSessionDraft, stripeConfigStatus } from './stripe-scaffold.mjs';

export function assertTestCheckoutReady(env = process.env) {
  const config = stripeConfigStatus(env);
  if (!config.configured) return { ok: false, status: 503, reason: `Missing payment env: ${config.missing.join(', ')}` };
  if (config.mode !== 'test') return { ok: false, status: 403, reason: 'Only test-mode checkout is enabled by this build.' };
  return { ok: true, status: 200, reason: 'Test-mode checkout is enabled.' };
}

export function encodeForm(payload) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(payload)) {
    if (value === undefined || value === null) continue;
    if (Array.isArray(value)) {
      value.forEach((item) => params.append(key, item));
    } else if (typeof value === 'object') {
      params.append(key, JSON.stringify(value));
    } else {
      params.append(key, String(value));
    }
  }
  return params;
}

export function draftToProviderForm(draft) {
  const request = draft.request;
  const lineItem = request.line_items?.[0] || {};
  return encodeForm({
    mode: request.mode,
    customer_email: request.customer_email,
    success_url: request.success_url,
    cancel_url: request.cancel_url,
    allow_promotion_codes: request.allow_promotion_codes ? 'true' : 'false',
    billing_address_collection: request.billing_address_collection,
    'line_items[0][price]': lineItem.price,
    'line_items[0][price_lookup_key]': lineItem.price_lookup_key,
    'line_items[0][quantity]': lineItem.quantity || 1,
    metadata: request.metadata,
    subscription_data: request.subscription_data
  });
}

export async function createTestCheckoutSession({ planSlug, productSlug, interval = 'monthly', customerEmail = null, businessSlug = null, successPath, cancelPath }, env = process.env, fetchImpl = fetch) {
  const ready = assertTestCheckoutReady(env);
  const draft = createCheckoutSessionDraft({ planSlug, productSlug, interval, customerEmail, businessSlug, successPath, cancelPath }, env);
  if (!ready.ok) return { ok: false, status: ready.status, error: ready.reason, draft };
  if (!fetchImpl) return { ok: false, status: 500, error: 'fetch implementation is required for test checkout creation.', draft };
  const response = await fetchImpl('https://api.stripe.com/v1/checkout/sessions', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${env.STRIPE_SECRET_KEY}`,
      'content-type': 'application/x-www-form-urlencoded'
    },
    body: draftToProviderForm(draft)
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) return { ok: false, status: response.status, error: payload.error?.message || 'Provider checkout session creation failed.', payload, draft };
  return { ok: true, status: response.status, checkoutUrl: payload.url, sessionId: payload.id, payload, draft };
}

export function parseSignatureHeader(header) {
  return Object.fromEntries(String(header || '').split(',').map((part) => part.split('=')).filter((parts) => parts.length === 2).map(([key, value]) => [key.trim(), value.trim()]));
}

export function verifyWebhookSignature({ payload, header, secret, toleranceSeconds = 300, nowSeconds = Math.floor(Date.now() / 1000) }) {
  if (!payload || !header || !secret) return { ok: false, reason: 'missing_signature_inputs' };
  const parsed = parseSignatureHeader(header);
  if (!parsed.t || !parsed.v1) return { ok: false, reason: 'malformed_signature_header' };
  const timestamp = Number(parsed.t);
  if (!Number.isFinite(timestamp)) return { ok: false, reason: 'invalid_signature_timestamp' };
  if (Math.abs(nowSeconds - timestamp) > toleranceSeconds) return { ok: false, reason: 'signature_timestamp_outside_tolerance' };
  const signedPayload = `${timestamp}.${payload}`;
  const expected = createHmac('sha256', secret).update(signedPayload).digest('hex');
  const expectedBuffer = Buffer.from(expected, 'hex');
  const actualBuffer = Buffer.from(parsed.v1, 'hex');
  if (expectedBuffer.length !== actualBuffer.length) return { ok: false, reason: 'signature_length_mismatch' };
  if (!timingSafeEqual(expectedBuffer, actualBuffer)) return { ok: false, reason: 'signature_mismatch' };
  return { ok: true, timestamp };
}
