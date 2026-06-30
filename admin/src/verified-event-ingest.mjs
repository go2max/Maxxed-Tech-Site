import { applyStripeEventToCommerceState, createEmptyCommerceState } from './commerce-store.mjs';
import { entitlementUpdateFromStripeEvent } from './stripe-scaffold.mjs';
import { verifyWebhookSignature } from './test-checkout-client.mjs';
import { d1RecordWebhookEvent, d1UpsertSubscriptionAndEntitlement } from './d1-commerce-adapter.mjs';

export function parseVerifiedEventPayload(rawPayload) {
  try {
    return { ok: true, event: JSON.parse(rawPayload) };
  } catch (error) {
    return { ok: false, error: 'invalid_event_json', detail: error.message };
  }
}

export async function ingestVerifiedEventWithD1(db, event, actor = 'verified_event') {
  const preview = entitlementUpdateFromStripeEvent(event);
  const recorded = await d1RecordWebhookEvent(db, event, {
    processingState: preview.handled ? 'processed' : 'ignored',
    resultSummary: JSON.stringify(preview).slice(0, 1000)
  });
  if (recorded.duplicate || !preview.handled) {
    return { ok: true, persistence: 'd1_adapter', duplicate: recorded.duplicate, result: preview };
  }
  await d1UpsertSubscriptionAndEntitlement(db, {
    customerId: preview.customerId,
    businessId: preview.businessId,
    planSlug: preview.planSlug,
    productSlug: preview.productSlug,
    stripeSubscriptionId: preview.subscriptionId,
    state: preview.state,
    currentPeriodEndsAt: preview.entitlement?.endsAt || null
  });
  return { ok: true, persistence: 'd1_adapter', duplicate: false, result: preview, actor };
}

export function ingestVerifiedEventInMemory(env, event) {
  env.__COMMERCE_STATE ||= createEmptyCommerceState();
  const synced = applyStripeEventToCommerceState(env.__COMMERCE_STATE, event, 'verified_event');
  env.__COMMERCE_STATE = synced.state;
  return {
    ok: true,
    persistence: 'memory_scaffold',
    duplicate: synced.duplicate,
    result: synced.result,
    stateSummary: {
      subscriptions: synced.state.subscriptions.length,
      entitlements: synced.state.entitlements.length,
      webhookEvents: synced.state.webhookEvents.length
    }
  };
}

export async function ingestSignedEventRequest(request, env = process.env) {
  const rawPayload = await request.text();
  const signatureHeader = request.headers.get('stripe-signature') || request.headers.get('Stripe-Signature') || '';
  const verification = verifyWebhookSignature({ payload: rawPayload, header: signatureHeader, secret: env.STRIPE_WEBHOOK_SECRET });
  if (!verification.ok) {
    return { ok: false, status: 400, error: verification.reason };
  }
  const parsed = parseVerifiedEventPayload(rawPayload);
  if (!parsed.ok) {
    return { ok: false, status: 400, error: parsed.error, detail: parsed.detail };
  }
  const db = env.DB || env.COMMERCE_DB || null;
  if (db) return ingestVerifiedEventWithD1(db, parsed.event);
  return ingestVerifiedEventInMemory(env, parsed.event);
}
