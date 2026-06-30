import assert from 'node:assert/strict';
import { d1GetEntitlementByKey, d1RecordUsageEvent, d1RecordWebhookEvent, d1UpsertBusinessAccount, d1UpsertCustomer, d1UpsertSubscriptionAndEntitlement } from '../src/d1-commerce-adapter.mjs';

function createMockD1() {
  const tables = {
    customers: [],
    business_accounts: [],
    stripe_webhook_events: [],
    subscriptions: [],
    entitlements: [],
    usage_events: []
  };
  const db = {
    tables,
    prepare(sql) {
      return {
        params: [],
        bind(...params) { this.params = params; return this; },
        async first() { return executeFirst(tables, sql, this.params); },
        async run() { executeRun(tables, sql, this.params); return { success: true }; }
      };
    }
  };
  return db;
}

function executeFirst(tables, sql, params) {
  if (sql.includes('FROM customers WHERE email')) return tables.customers.find((row) => row.email === params[0]) || null;
  if (sql.includes('FROM customers WHERE stripe_customer_id')) return tables.customers.find((row) => row.stripe_customer_id === params[0]) || null;
  if (sql.includes('FROM stripe_webhook_events')) return tables.stripe_webhook_events.find((row) => row.id === params[0]) || null;
  if (sql.includes('FROM usage_events WHERE idempotency_key')) return tables.usage_events.find((row) => row.idempotency_key === params[0]) || null;
  if (sql.includes('FROM entitlements WHERE')) {
    let rows = tables.entitlements.filter((row) => row.entitlement_key === params[0]);
    if (params[1]) rows = rows.filter((row) => row.customer_id === params[1] || row.business_id === params[1]);
    if (params[2]) rows = rows.filter((row) => row.business_id === params[2]);
    return rows.at(-1) || null;
  }
  return null;
}

function upsertById(rows, record) {
  const existing = rows.find((row) => row.id === record.id);
  if (existing) Object.assign(existing, record);
  else rows.push(record);
}

function executeRun(tables, sql, params) {
  if (sql.includes('INSERT INTO customers')) {
    upsertById(tables.customers, { id: params[0], email: params[1], display_name: params[2], stripe_customer_id: params[3], status: params[4], created_at: params[5], updated_at: params[6] });
    return;
  }
  if (sql.includes('INSERT INTO business_accounts')) {
    upsertById(tables.business_accounts, { id: params[0], owner_customer_id: params[1], name: params[2], slug: params[3], status: params[4], created_at: params[5], updated_at: params[6] });
    return;
  }
  if (sql.includes('INSERT INTO stripe_webhook_events')) {
    tables.stripe_webhook_events.push({ id: params[0], event_type: params[1], livemode: params[2], received_at: params[3], processed_at: params[4], processing_state: params[5], result_summary: params[6], error_message: params[7] });
    return;
  }
  if (sql.includes('INSERT INTO subscriptions')) {
    upsertById(tables.subscriptions, { id: params[0], customer_id: params[1], business_id: params[2], plan_id: params[3], stripe_subscription_id: params[4], billing_interval: params[5], state: params[6], trial_ends_at: params[7], current_period_ends_at: params[8], grace_ends_at: params[9], created_at: params[10], updated_at: params[11] });
    return;
  }
  if (sql.includes('INSERT INTO entitlements')) {
    upsertById(tables.entitlements, { id: params[0], subscription_id: params[1], customer_id: params[2], business_id: params[3], commerce_product_id: params[4], entitlement_key: params[5], state: params[6], access_level: params[7], starts_at: params[8], ends_at: params[9], updated_at: params[10] });
    return;
  }
  if (sql.includes('INSERT INTO usage_events')) {
    tables.usage_events.push({ id: params[0], meter_key: params[1], customer_id: params[2], business_id: params[3], commerce_product_id: params[4], quantity: params[5], idempotency_key: params[6], metadata: params[7], created_at: params[8] });
  }
}

const db = createMockD1();
const customer = await d1UpsertCustomer(db, { email: 'tester@example.com', stripeCustomerId: 'cus_123' });
assert.equal(customer.id, 'cus_tester_example_com');
assert.equal(db.tables.customers.length, 1);

const business = await d1UpsertBusinessAccount(db, { ownerCustomerId: customer.id, name: 'Tester LLC', slug: 'tester-llc' });
assert.equal(business.id, 'biz_tester_llc');
assert.equal(db.tables.business_accounts.length, 1);

const webhook = await d1RecordWebhookEvent(db, { id: 'evt_1', type: 'customer.subscription.updated', livemode: false }, { resultSummary: 'handled' });
assert.equal(webhook.duplicate, false);
const duplicateWebhook = await d1RecordWebhookEvent(db, { id: 'evt_1', type: 'customer.subscription.updated', livemode: false }, { resultSummary: 'handled again' });
assert.equal(duplicateWebhook.duplicate, true);
assert.equal(db.tables.stripe_webhook_events.length, 1);

const synced = await d1UpsertSubscriptionAndEntitlement(db, { customerId: customer.id, planSlug: 'plugin-starter', productSlug: 'post-purge-pro', stripeSubscriptionId: 'sub_123', state: 'active' });
assert.equal(synced.entitlementKey, 'plugin.post_purge_pro');
assert.equal(db.tables.subscriptions.length, 1);
assert.equal(db.tables.entitlements.length, 1);

const entitlement = await d1GetEntitlementByKey(db, { customerId: customer.id, entitlementKey: 'plugin.post_purge_pro' });
assert.equal(entitlement.state, 'active');

const usage = await d1RecordUsageEvent(db, { customerId: customer.id, meterKey: 'actions', quantity: 1, idempotencyKey: 'usage_1' });
assert.equal(usage.duplicate, false);
const duplicateUsage = await d1RecordUsageEvent(db, { customerId: customer.id, meterKey: 'actions', quantity: 1, idempotencyKey: 'usage_1' });
assert.equal(duplicateUsage.duplicate, true);
assert.equal(db.tables.usage_events.length, 1);

console.log('d1 commerce adapter tests passed');
