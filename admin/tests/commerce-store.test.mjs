import assert from 'node:assert/strict';
import { applyStripeEventToCommerceState, createEmptyCommerceState, recordUsageEvent, recordWebhookEvent, stableId, upsertBusinessAccount, upsertCustomer, upsertSubscription } from '../src/commerce-store.mjs';

assert.equal(stableId('sub', 'cus_123', 'plugin-starter'), 'sub_cus_123_plugin_starter');

let state = createEmptyCommerceState();
state = upsertCustomer(state, { email: 'tester@example.com', stripeCustomerId: 'cus_123' }, 'test');
assert.equal(state.customers.length, 1);
assert.equal(state.auditEvents.at(-1).action, 'customer.upsert');

state = upsertCustomer(state, { email: 'tester@example.com', displayName: 'Tester' }, 'test');
assert.equal(state.customers.length, 1);
assert.equal(state.customers[0].displayName, 'Tester');

state = upsertBusinessAccount(state, { ownerCustomerId: state.customers[0].id, name: 'Tester LLC', slug: 'tester-llc' }, 'test');
assert.equal(state.businessAccounts.length, 1);

state = upsertSubscription(state, {
  customerId: state.customers[0].id,
  planSlug: 'plugin-starter',
  productSlug: 'post-purge-pro',
  stripeSubscriptionId: 'sub_123',
  state: 'active'
}, 'test');
assert.equal(state.subscriptions.length, 1);
assert.equal(state.entitlements.length, 1);
assert.equal(state.entitlements[0].entitlementKey, 'plugin.post_purge_pro');
assert.equal(state.entitlements[0].state, 'active');

let usage = recordUsageEvent(state, { planSlug: 'plugin-starter', meterKey: 'actions', customerId: state.customers[0].id, productSlug: 'post-purge-pro', usedBefore: 10, quantity: 2, idempotencyKey: 'usage_1' }, 'test');
assert.equal(usage.decision.decision, 'allow');
assert.equal(usage.state.usageEvents.length, 1);
usage = recordUsageEvent(usage.state, { planSlug: 'plugin-starter', meterKey: 'actions', customerId: state.customers[0].id, productSlug: 'post-purge-pro', usedBefore: 10, quantity: 2, idempotencyKey: 'usage_1' }, 'test');
assert.equal(usage.decision.duplicate, true);
assert.equal(usage.state.usageEvents.length, 1);

const stripeEvent = {
  id: 'evt_123',
  type: 'customer.subscription.updated',
  data: {
    object: {
      id: 'sub_123',
      customer: 'cus_123',
      status: 'past_due',
      metadata: {
        plan_slug: 'plugin-starter',
        product_slug: 'post-purge-pro'
      }
    }
  }
};
let webhook = recordWebhookEvent(state, stripeEvent, 'stripe');
assert.equal(webhook.duplicate, false);
webhook = recordWebhookEvent(webhook.state, stripeEvent, 'stripe');
assert.equal(webhook.duplicate, true);

const synced = applyStripeEventToCommerceState(createEmptyCommerceState(), stripeEvent, 'stripe');
assert.equal(synced.result.handled, true);
assert.equal(synced.state.subscriptions.length, 1);
assert.equal(synced.state.entitlements[0].state, 'past_due');
assert.equal(synced.state.webhookEvents.length, 1);

console.log('commerce store tests passed');
