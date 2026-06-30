import { commercePlans, commerceProducts } from './commerce.mjs';
import { entitlementFromSubscription } from './entitlements.mjs';
import { stableId, nowIso } from './commerce-store.mjs';

function requireDb(db) {
  if (!db || typeof db.prepare !== 'function') throw new Error('D1 database binding with prepare() is required');
  return db;
}

function bind(stmt, params = []) {
  return stmt.bind(...params);
}

function planIdFromSlug(planSlug) {
  const plan = commercePlans.find((item) => item.slug === planSlug);
  if (!plan) throw new Error(`Unknown plan slug: ${planSlug}`);
  return plan.id;
}

function productFromSlug(productSlug) {
  const product = commerceProducts.find((item) => item.slug === productSlug);
  if (!product) throw new Error(`Unknown product slug: ${productSlug}`);
  return product;
}

export async function d1UpsertCustomer(db, { email, stripeCustomerId = null, displayName = null, status = 'active' }) {
  requireDb(db);
  if (!email && !stripeCustomerId) throw new Error('Customer requires email or Stripe customer id');
  const id = stableId('cus', email || stripeCustomerId);
  const existing = email
    ? await bind(db.prepare('SELECT id FROM customers WHERE email = ?'), [email]).first()
    : await bind(db.prepare('SELECT id FROM customers WHERE stripe_customer_id = ?'), [stripeCustomerId]).first();
  const customerId = existing?.id || id;
  await bind(db.prepare(`INSERT INTO customers (id,email,display_name,stripe_customer_id,status,created_at,updated_at)
    VALUES (?,?,?,?,?,?,?)
    ON CONFLICT(id) DO UPDATE SET email=excluded.email, display_name=COALESCE(excluded.display_name, customers.display_name), stripe_customer_id=COALESCE(excluded.stripe_customer_id, customers.stripe_customer_id), status=excluded.status, updated_at=excluded.updated_at`),
    [customerId, email || '', displayName, stripeCustomerId, status, nowIso(), nowIso()]
  ).run();
  return { id: customerId, email: email || '', displayName, stripeCustomerId, status };
}

export async function d1UpsertBusinessAccount(db, { ownerCustomerId, name, slug, status = 'active' }) {
  requireDb(db);
  const id = stableId('biz', slug);
  await bind(db.prepare(`INSERT INTO business_accounts (id,owner_customer_id,name,slug,status,created_at,updated_at)
    VALUES (?,?,?,?,?,?,?)
    ON CONFLICT(slug) DO UPDATE SET owner_customer_id=excluded.owner_customer_id, name=excluded.name, status=excluded.status, updated_at=excluded.updated_at`),
    [id, ownerCustomerId, name, slug, status, nowIso(), nowIso()]
  ).run();
  return { id, ownerCustomerId, name, slug, status };
}

export async function d1RecordWebhookEvent(db, event, { processingState = 'processed', resultSummary = null, errorMessage = null } = {}) {
  requireDb(db);
  if (!event?.id || !event?.type) throw new Error('Webhook event requires id and type');
  const existing = await bind(db.prepare('SELECT id, processing_state FROM stripe_webhook_events WHERE id = ?'), [event.id]).first();
  if (existing) return { duplicate: true, id: event.id, processingState: existing.processing_state };
  await bind(db.prepare(`INSERT INTO stripe_webhook_events (id,event_type,livemode,received_at,processed_at,processing_state,result_summary,error_message)
    VALUES (?,?,?,?,?,?,?,?)`),
    [event.id, event.type, event.livemode ? 1 : 0, nowIso(), nowIso(), processingState, resultSummary, errorMessage]
  ).run();
  return { duplicate: false, id: event.id, processingState };
}

export async function d1UpsertSubscriptionAndEntitlement(db, { customerId = null, businessId = null, planSlug, productSlug, stripeSubscriptionId = null, billingInterval = 'monthly', state = 'trialing', trialEndsAt = null, currentPeriodEndsAt = null, graceEndsAt = null }) {
  requireDb(db);
  if (!customerId && !businessId) throw new Error('Subscription requires customerId or businessId');
  const product = productFromSlug(productSlug);
  const planId = planIdFromSlug(planSlug);
  const subscriptionId = stableId('sub', stripeSubscriptionId || customerId || businessId, planSlug, productSlug);
  await bind(db.prepare(`INSERT INTO subscriptions (id,customer_id,business_id,plan_id,stripe_subscription_id,billing_interval,state,trial_ends_at,current_period_ends_at,grace_ends_at,created_at,updated_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?)
    ON CONFLICT(id) DO UPDATE SET customer_id=excluded.customer_id, business_id=excluded.business_id, plan_id=excluded.plan_id, stripe_subscription_id=excluded.stripe_subscription_id, billing_interval=excluded.billing_interval, state=excluded.state, trial_ends_at=excluded.trial_ends_at, current_period_ends_at=excluded.current_period_ends_at, grace_ends_at=excluded.grace_ends_at, updated_at=excluded.updated_at`),
    [subscriptionId, customerId, businessId, planId, stripeSubscriptionId, billingInterval, state, trialEndsAt, currentPeriodEndsAt, graceEndsAt, nowIso(), nowIso()]
  ).run();
  const entitlement = entitlementFromSubscription({ subscriptionId, customerId, businessId, productSlug, state, endsAt: currentPeriodEndsAt });
  await bind(db.prepare(`INSERT INTO entitlements (id,subscription_id,customer_id,business_id,commerce_product_id,entitlement_key,state,access_level,starts_at,ends_at,updated_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,?)
    ON CONFLICT(id) DO UPDATE SET subscription_id=excluded.subscription_id, customer_id=excluded.customer_id, business_id=excluded.business_id, commerce_product_id=excluded.commerce_product_id, entitlement_key=excluded.entitlement_key, state=excluded.state, access_level=excluded.access_level, ends_at=excluded.ends_at, updated_at=excluded.updated_at`),
    [entitlement.id, subscriptionId, customerId, businessId, product.id, entitlement.entitlementKey, state, entitlement.accessLevel, entitlement.startsAt, currentPeriodEndsAt, nowIso()]
  ).run();
  return { subscriptionId, entitlementId: entitlement.id, entitlementKey: entitlement.entitlementKey, state };
}

export async function d1RecordUsageEvent(db, { id, meterKey = 'actions', customerId = null, businessId = null, commerceProductId = null, quantity = 1, idempotencyKey = null, metadata = {} }) {
  requireDb(db);
  if (!customerId && !businessId) throw new Error('Usage event requires customerId or businessId');
  if (idempotencyKey) {
    const existing = await bind(db.prepare('SELECT id FROM usage_events WHERE idempotency_key = ?'), [idempotencyKey]).first();
    if (existing) return { duplicate: true, id: existing.id };
  }
  const usageId = id || stableId('usage', customerId || businessId, meterKey, Date.now());
  await bind(db.prepare(`INSERT INTO usage_events (id,meter_key,customer_id,business_id,commerce_product_id,quantity,idempotency_key,metadata,created_at)
    VALUES (?,?,?,?,?,?,?,?,?)`),
    [usageId, meterKey, customerId, businessId, commerceProductId, quantity, idempotencyKey, JSON.stringify(metadata || {}), nowIso()]
  ).run();
  return { duplicate: false, id: usageId };
}

export async function d1GetEntitlementByKey(db, { customerId = null, businessId = null, entitlementKey }) {
  requireDb(db);
  if (!entitlementKey) throw new Error('entitlementKey is required');
  const clauses = ['entitlement_key = ?'];
  const params = [entitlementKey];
  if (customerId) { clauses.push('customer_id = ?'); params.push(customerId); }
  if (businessId) { clauses.push('business_id = ?'); params.push(businessId); }
  const row = await bind(db.prepare(`SELECT * FROM entitlements WHERE ${clauses.join(' AND ')} ORDER BY updated_at DESC LIMIT 1`), params).first();
  if (!row) return null;
  return {
    id: row.id,
    subscriptionId: row.subscription_id,
    customerId: row.customer_id,
    businessId: row.business_id,
    commerceProductId: row.commerce_product_id,
    entitlementKey: row.entitlement_key,
    state: row.state,
    accessLevel: row.access_level,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    updatedAt: row.updated_at
  };
}
