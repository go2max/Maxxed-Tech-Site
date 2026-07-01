import { entitlementFromSubscription, usageDecision } from './entitlements.mjs';
import { entitlementUpdateFromStripeEvent } from './stripe-scaffold.mjs';

export function nowIso() {
  return new Date().toISOString();
}

export function stableId(prefix, ...parts) {
  return `${prefix}_${parts.filter(Boolean).join('_')}`.replaceAll(/[^a-zA-Z0-9_]/g, '_').replaceAll(/_+/g, '_');
}

export function createEmptyCommerceState() {
  return {
    customers: [],
    businessAccounts: [],
    businessSeats: [],
    subscriptions: [],
    entitlements: [],
    usageEvents: [],
    webhookEvents: [],
    auditEvents: []
  };
}

export function audit(action, targetType, targetId, actor = 'system', detail = {}) {
  return {
    id: stableId('audit', action, targetType, targetId, Date.now()),
    actorEmail: actor,
    action,
    targetType,
    targetId,
    detail,
    createdAt: nowIso()
  };
}

export function upsertCustomer(state, { email, stripeCustomerId = null, displayName = null, status = 'active' }, actor = 'system') {
  if (!email && !stripeCustomerId) throw new Error('Customer requires email or Stripe customer id');
  const next = structuredClone(state);
  const existing = next.customers.find((customer) => (email && customer.email === email) || (stripeCustomerId && customer.stripeCustomerId === stripeCustomerId));
  if (existing) {
    Object.assign(existing, { email: email || existing.email, stripeCustomerId: stripeCustomerId || existing.stripeCustomerId, displayName: displayName || existing.displayName, status, updatedAt: nowIso() });
    next.auditEvents.push(audit('customer.upsert', 'customer', existing.id, actor, { mode: 'update' }));
    return next;
  }
  const customer = { id: stableId('cus', email || stripeCustomerId), email: email || '', stripeCustomerId, displayName, status, createdAt: nowIso(), updatedAt: nowIso() };
  next.customers.push(customer);
  next.auditEvents.push(audit('customer.upsert', 'customer', customer.id, actor, { mode: 'insert' }));
  return next;
}

export function upsertBusinessAccount(state, { ownerCustomerId, name, slug, status = 'active' }, actor = 'system') {
  if (!ownerCustomerId || !name || !slug) throw new Error('Business account requires ownerCustomerId, name, and slug');
  const next = structuredClone(state);
  const existing = next.businessAccounts.find((business) => business.slug === slug);
  if (existing) {
    Object.assign(existing, { ownerCustomerId, name, status, updatedAt: nowIso() });
    next.auditEvents.push(audit('business.upsert', 'business', existing.id, actor, { mode: 'update' }));
    return next;
  }
  const business = { id: stableId('biz', slug), ownerCustomerId, name, slug, status, createdAt: nowIso(), updatedAt: nowIso() };
  next.businessAccounts.push(business);
  next.auditEvents.push(audit('business.upsert', 'business', business.id, actor, { mode: 'insert' }));
  return next;
}

export function upsertSubscription(state, { id, customerId = null, businessId = null, planSlug, stripeSubscriptionId = null, billingInterval = 'monthly', state: subscriptionState = 'trialing', productSlug, trialEndsAt = null, currentPeriodEndsAt = null, graceEndsAt = null }, actor = 'system') {
  if (!planSlug || !productSlug) throw new Error('Subscription requires planSlug and productSlug');
  if (!customerId && !businessId) throw new Error('Subscription requires customerId or businessId');
  const next = structuredClone(state);
  const subscriptionId = id || stableId('sub', stripeSubscriptionId || customerId || businessId, planSlug, productSlug);
  const existing = next.subscriptions.find((subscription) => subscription.id === subscriptionId || (stripeSubscriptionId && subscription.stripeSubscriptionId === stripeSubscriptionId));
  const record = { id: subscriptionId, customerId, businessId, planSlug, productSlug, stripeSubscriptionId, billingInterval, state: subscriptionState, trialEndsAt, currentPeriodEndsAt, graceEndsAt, updatedAt: nowIso() };
  if (existing) {
    Object.assign(existing, record);
    next.auditEvents.push(audit('subscription.upsert', 'subscription', existing.id, actor, { mode: 'update', state: subscriptionState }));
  } else {
    next.subscriptions.push({ ...record, createdAt: nowIso() });
    next.auditEvents.push(audit('subscription.upsert', 'subscription', subscriptionId, actor, { mode: 'insert', state: subscriptionState }));
  }
  return upsertEntitlement(next, { subscriptionId, customerId, businessId, productSlug, state: subscriptionState, endsAt: currentPeriodEndsAt }, actor);
}

export function upsertEntitlement(state, { subscriptionId, customerId = null, businessId = null, productSlug, state: entitlementState = 'trialing', accessLevel = 'pro', endsAt = null }, actor = 'system') {
  const next = structuredClone(state);
  const entitlement = entitlementFromSubscription({ subscriptionId, customerId, businessId, productSlug, state: entitlementState, accessLevel, endsAt });
  const existing = next.entitlements.find((item) => item.id === entitlement.id || (item.subscriptionId === subscriptionId && item.entitlementKey === entitlement.entitlementKey));
  const record = { ...entitlement, updatedAt: nowIso() };
  if (existing) {
    Object.assign(existing, record);
    next.auditEvents.push(audit('entitlement.upsert', 'entitlement', existing.id, actor, { mode: 'update', state: entitlementState }));
  } else {
    next.entitlements.push({ ...record, createdAt: nowIso() });
    next.auditEvents.push(audit('entitlement.upsert', 'entitlement', entitlement.id, actor, { mode: 'insert', state: entitlementState }));
  }
  return next;
}

export function recordUsageEvent(state, { planSlug, meterKey = 'actions', customerId = null, businessId = null, productSlug, usedBefore = 0, quantity = 1, idempotencyKey = null, metadata = {} }, actor = 'system') {
  const next = structuredClone(state);
  const existing = idempotencyKey ? next.usageEvents.find((event) => event.idempotencyKey === idempotencyKey) : null;
  if (existing) return { state: next, decision: { duplicate: true, id: existing.id } };
  const decision = usageDecision({ planSlug, meterKey, usedBefore, quantity });
  const id = stableId('usage', customerId || businessId || productSlug || 'unknown', meterKey, Date.now());
  next.usageEvents.push({ id, meterKey, customerId, businessId, productSlug, quantity, idempotencyKey, metadata, createdAt: nowIso() });
  next.auditEvents.push(audit('usage.record', 'usage', id, actor, { meterKey, quantity, decision: decision.decision }));
  return { state: next, decision: { ...decision, duplicate: false, id } };
}

export function recordWebhookEvent(state, event, actor = 'stripe') {
  if (!event?.id || !event?.type) throw new Error('Stripe event requires id and type');
  const next = structuredClone(state);
  const existing = next.webhookEvents.find((item) => item.id === event.id);
  if (existing) return { state: next, duplicate: true, event: existing };
  const record = {
    id: event.id,
    eventType: event.type,
    livemode: Boolean(event.livemode),
    receivedAt: nowIso(),
    processedAt: null,
    processingState: 'received',
    resultSummary: null,
    errorMessage: null
  };
  next.webhookEvents.push(record);
  next.auditEvents.push(audit('webhook.received', 'webhook', event.id, actor, { type: event.type }));
  return { state: next, duplicate: false, event: record };
}

export function applyStripeEventToCommerceState(state, event, actor = 'stripe') {
  const webhook = recordWebhookEvent(state, event, actor);
  if (webhook.duplicate) return { state: webhook.state, result: { duplicate: true, handled: false } };
  const update = entitlementUpdateFromStripeEvent(event);
  if (!update) return { state: webhook.state, result: { duplicate: false, handled: false } };
  const object = event.data.object;
  const customerId = stableId('cus', object.customer || 'unknown');
  let next = webhook.state;
  const existingCustomer = next.customers.find((customer) => customer.id === customerId || customer.stripeCustomerId === object.customer);
  if (!existingCustomer) next = upsertCustomer(next, { email: '', stripeCustomerId: object.customer, status: 'active' }, actor);
  next = upsertSubscription(next, { customerId, planSlug: update.planSlug, productSlug: update.productSlug, stripeSubscriptionId: object.id, state: update.state, currentPeriodEndsAt: update.endsAt }, actor);
  const eventRecord = next.webhookEvents.find((item) => item.id === event.id);
  if (eventRecord) Object.assign(eventRecord, { processedAt: nowIso(), processingState: 'processed', resultSummary: `subscription ${update.state}` });
  return { state: next, result: { duplicate: false, handled: true, state: update.state } };
}