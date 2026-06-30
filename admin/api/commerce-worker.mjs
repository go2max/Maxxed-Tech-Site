import { createCheckoutSessionDraft, entitlementUpdateFromStripeEvent, webhookSafetyChecklist } from '../src/stripe-scaffold.mjs';
import { createTestCheckoutSession, verifyWebhookSignature } from '../src/test-checkout-client.mjs';
import { ingestSignedEventRequest } from '../src/verified-event-ingest.mjs';
import { evaluateEntitlement } from '../src/entitlements.mjs';
import { applyStripeEventToCommerceState, createEmptyCommerceState, recordUsageEvent } from '../src/commerce-store.mjs';
import { d1GetEntitlementByKey, d1RecordUsageEvent, d1RecordWebhookEvent, d1UpsertSubscriptionAndEntitlement } from '../src/d1-commerce-adapter.mjs';

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

async function applyWebhookWithD1(db, event) {
  const preview = entitlementUpdateFromStripeEvent(event);
  const recorded = await d1RecordWebhookEvent(db, event, { processingState: preview.handled ? 'processed' : 'ignored', resultSummary: JSON.stringify(preview).slice(0, 1000) });
  if (recorded.duplicate || !preview.handled) return { duplicate: recorded.duplicate, result: preview };
  await d1UpsertSubscriptionAndEntitlement(db, {
    customerId: preview.customerId,
    businessId: preview.businessId,
    planSlug: preview.planSlug,
    productSlug: preview.productSlug,
    stripeSubscriptionId: preview.subscriptionId,
    state: preview.state,
    currentPeriodEndsAt: preview.entitlement?.endsAt || null
  });
  return { duplicate: false, result: preview };
}

export async function handleCommerceRequest(request, env = process.env) {
  const url = new URL(request.url);
  const db = env.DB || env.COMMERCE_DB || null;

  if (request.method === 'GET' && url.pathname.endsWith('/api/commerce/health')) {
    return json({ ok: true, stripe: webhookSafetyChecklist(env), persistence: db ? 'd1_adapter' : 'memory_scaffold' });
  }

  if (request.method === 'POST' && url.pathname.endsWith('/api/commerce/checkout-session')) {
    const body = await readJson(request);
    const draft = createCheckoutSessionDraft(body, env);
    if (!draft.enabled) return json({ ok: false, error: draft.blockedReason, draft }, { status: 503 });
    return json({ ok: true, draft, note: 'Checkout response is still a scaffold and does not redirect to payment yet.' });
  }

  if (request.method === 'POST' && url.pathname.endsWith('/api/commerce/test-checkout-session')) {
    const body = await readJson(request);
    const result = await createTestCheckoutSession(body, env, env.TEST_FETCH || fetch);
    return json(result, { status: result.status || (result.ok ? 200 : 500) });
  }

  if (request.method === 'POST' && url.pathname.endsWith('/api/commerce/verify-webhook-signature')) {
    const body = await readJson(request);
    return json({ ok: true, result: verifyWebhookSignature({ payload: body.payload, header: body.header, secret: env.STRIPE_WEBHOOK_SECRET, nowSeconds: body.nowSeconds }) });
  }

  if (request.method === 'POST' && url.pathname.endsWith('/api/commerce/verified-event')) {
    const result = await ingestSignedEventRequest(request, env);
    return json(result, { status: result.status || (result.ok ? 200 : 500) });
  }

  if (request.method === 'POST' && url.pathname.endsWith('/api/commerce/webhook-preview')) {
    const event = await readJson(request);
    if (db) {
      const synced = await applyWebhookWithD1(db, event);
      return json({ ok: true, persistence: 'd1_adapter', duplicate: synced.duplicate, result: synced.result });
    }
    const synced = applyStripeEventToCommerceState(memoryState(env), event, 'stripe_preview');
    saveMemoryState(env, synced.state);
    return json({ ok: true, persistence: 'memory_scaffold', duplicate: synced.duplicate, result: synced.result, stateSummary: { subscriptions: synced.state.subscriptions.length, entitlements: synced.state.entitlements.length, webhookEvents: synced.state.webhookEvents.length } });
  }

  if (request.method === 'POST' && url.pathname.endsWith('/api/commerce/evaluate-entitlement')) {
    const body = await readJson(request);
    if (db && body.entitlementKey) {
      const entitlement = await d1GetEntitlementByKey(db, { customerId: body.customerId, businessId: body.businessId, entitlementKey: body.entitlementKey });
      return json({ ok: true, persistence: 'd1_adapter', result: evaluateEntitlement(entitlement, body.context || {}) });
    }
    return json({ ok: true, persistence: 'memory_scaffold', result: evaluateEntitlement(body.entitlement, body.context || {}) });
  }

  if (request.method === 'POST' && url.pathname.endsWith('/api/commerce/usage-check')) {
    const body = await readJson(request);
    if (db) {
      const recorded = await d1RecordUsageEvent(db, body);
      return json({ ok: true, persistence: 'd1_adapter', result: recorded });
    }
    const recorded = recordUsageEvent(memoryState(env), body, 'usage_api');
    saveMemoryState(env, recorded.state);
    return json({ ok: true, persistence: 'memory_scaffold', result: recorded.decision, stateSummary: { usageEvents: recorded.state.usageEvents.length } });
  }

  return json({ ok: false, error: 'Not found' }, { status: 404 });
}

export default {
  fetch: handleCommerceRequest
};
