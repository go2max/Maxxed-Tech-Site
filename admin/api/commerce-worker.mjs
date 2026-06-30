import { createCheckoutSessionDraft, entitlementUpdateFromStripeEvent, webhookSafetyChecklist } from '../src/stripe-scaffold.mjs';
import { evaluateEntitlement, usageDecision } from '../src/entitlements.mjs';

const json = (body, init = {}) => new Response(JSON.stringify(body, null, 2), {
  ...init,
  headers: {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    ...(init.headers || {})
  }
});

async function readJson(request) {
  try {
    return await request.json();
  } catch {
    return {};
  }
}

export async function handleCommerceRequest(request, env = process.env) {
  const url = new URL(request.url);

  if (request.method === 'GET' && url.pathname.endsWith('/api/commerce/health')) {
    return json({ ok: true, stripe: webhookSafetyChecklist(env) });
  }

  if (request.method === 'POST' && url.pathname.endsWith('/api/commerce/checkout-session')) {
    const body = await readJson(request);
    const draft = createCheckoutSessionDraft(body, env);
    if (!draft.enabled) return json({ ok: false, error: draft.blockedReason, draft }, { status: 503 });
    return json({ ok: true, draft, note: 'Scaffold only. Replace draft with real Stripe checkout.sessions.create call after secret handling is deployed.' });
  }

  if (request.method === 'POST' && url.pathname.endsWith('/api/commerce/webhook-preview')) {
    const event = await readJson(request);
    return json({ ok: true, result: entitlementUpdateFromStripeEvent(event) });
  }

  if (request.method === 'POST' && url.pathname.endsWith('/api/commerce/evaluate-entitlement')) {
    const body = await readJson(request);
    return json({ ok: true, result: evaluateEntitlement(body.entitlement, body.context || {}) });
  }

  if (request.method === 'POST' && url.pathname.endsWith('/api/commerce/usage-check')) {
    const body = await readJson(request);
    return json({ ok: true, result: usageDecision(body) });
  }

  return json({ ok: false, error: 'Not found' }, { status: 404 });
}

export default {
  fetch: handleCommerceRequest
};
