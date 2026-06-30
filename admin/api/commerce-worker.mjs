import { createCheckoutSessionDraft, webhookSafetyChecklist } from '../src/stripe-scaffold.mjs';
import { evaluateEntitlement } from '../src/entitlements.mjs';
import { applyStripeEventToCommerceState, createEmptyCommerceState, recordUsageEvent } from '../src/commerce-store.mjs';

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

function memoryState(env) {
  env.__COMMERCE_STATE ||= createEmptyCommerceState();
  return env.__COMMERCE_STATE;
}

function saveMemoryState(env, state) {
  env.__COMMERCE_STATE = state;
  return state;
}

export async function handleCommerceRequest(request, env = process.env) {
  const url = new URL(request.url);

  if (request.method === 'GET' && url.pathname.endsWith('/api/commerce/health')) {
    return json({ ok: true, stripe: webhookSafetyChecklist(env), persistence: env.DB ? 'd1_pending_adapter' : 'memory_scaffold' });
  }

  if (request.method === 'POST' && url.pathname.endsWith('/api/commerce/checkout-session')) {
    const body = await readJson(request);
    const draft = createCheckoutSessionDraft(body, env);
    if (!draft.enabled) return json({ ok: false, error: draft.blockedReason, draft }, { status: 503 });
    return json({ ok: true, draft, note: 'Scaffold only. Replace draft with real Stripe checkout.sessions.create call after secret handling is deployed.' });
  }

  if (request.method === 'POST' && url.pathname.endsWith('/api/commerce/webhook-preview')) {
    const event = await readJson(request);
    const synced = applyStripeEventToCommerceState(memoryState(env), event, 'stripe_preview');
    saveMemoryState(env, synced.state);
    return json({ ok: true, duplicate: synced.duplicate, result: synced.result, stateSummary: { subscriptions: synced.state.subscriptions.length, entitlements: synced.state.entitlements.length, webhookEvents: synced.state.webhookEvents.length } });
  }

  if (request.method === 'POST' && url.pathname.endsWith('/api/commerce/evaluate-entitlement')) {
    const body = await readJson(request);
    return json({ ok: true, result: evaluateEntitlement(body.entitlement, body.context || {}) });
  }

  if (request.method === 'POST' && url.pathname.endsWith('/api/commerce/usage-check')) {
    const body = await readJson(request);
    const recorded = recordUsageEvent(memoryState(env), body, 'usage_api');
    saveMemoryState(env, recorded.state);
    return json({ ok: true, result: recorded.decision, stateSummary: { usageEvents: recorded.state.usageEvents.length } });
  }

  return json({ ok: false, error: 'Not found' }, { status: 404 });
}

export default {
  fetch: handleCommerceRequest
};
