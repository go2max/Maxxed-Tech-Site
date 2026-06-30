import assert from 'node:assert/strict';
import { commerceSeedSummary, seedCommerceCatalog } from '../src/d1-commerce-seeds.mjs';

function createMockD1() {
  const tables = {
    commerce_groups: [],
    commerce_products: [],
    commerce_plans: [],
    usage_meters: []
  };
  return {
    tables,
    prepare(sql) {
      return {
        params: [],
        bind(...params) { this.params = params; return this; },
        async run() {
          if (sql.includes('INSERT INTO commerce_groups')) upsert(tables.commerce_groups, { id: this.params[0], slug: this.params[1], name: this.params[2], buyer_type: this.params[3], purchase_mode: this.params[4], description: this.params[5] }, 'slug');
          if (sql.includes('INSERT INTO commerce_products')) upsert(tables.commerce_products, { id: this.params[0], slug: this.params[1], name: this.params[2], group_slug: this.params[3], product_type: this.params[4], sales_status: this.params[5], demo_model: this.params[6], demo_limit: this.params[7], standalone: this.params[8], bundle_eligible: this.params[9], stripe_mode: this.params[10], support_email: this.params[11], checkout_state: this.params[12], entitlement_key: this.params[13], notes: this.params[14] }, 'slug');
          if (sql.includes('INSERT INTO commerce_plans')) upsert(tables.commerce_plans, { id: this.params[0], slug: this.params[1], name: this.params[2], group_slug: this.params[3], billing_model: this.params[4], monthly_usd: this.params[5], annual_usd: this.params[6], trial_days: this.params[7], included_seats: this.params[8], included_actions: this.params[9], included_storage_gb: this.params[10], extra_seat_usd: this.params[11], overage_unit: this.params[12], overage_usd: this.params[13], overage_policy: this.params[14], status: this.params[15] }, 'slug');
          if (sql.includes('INSERT INTO usage_meters')) upsert(tables.usage_meters, { id: this.params[0], meter_key: this.params[1], label: this.params[2], unit: this.params[3], warning_threshold: this.params[4], critical_threshold: this.params[5], status: this.params[6] }, 'meter_key');
          return { success: true };
        }
      };
    }
  };
}

function upsert(rows, record, key) {
  const existing = rows.find((row) => row[key] === record[key]);
  if (existing) Object.assign(existing, record);
  else rows.push(record);
}

const summary = commerceSeedSummary();
assert.equal(summary.groups, 5);
assert.equal(summary.products, 6);
assert.equal(summary.plans, 6);
assert.equal(summary.meters, 5);
assert.equal(summary.supportEmailOk, true);
assert.equal(summary.fieldStandaloneOk, true);
assert.equal(summary.businessUsagePlans, 3);

const db = createMockD1();
const result = await seedCommerceCatalog(db);
assert.equal(result.ok, true);
assert.equal(db.tables.commerce_groups.length, 5);
assert.equal(db.tables.commerce_products.length, 6);
assert.equal(db.tables.commerce_plans.length, 6);
assert.equal(db.tables.usage_meters.length, 5);
assert.equal(db.tables.commerce_products.every((product) => product.support_email === 'support@techmaxxed.com'), true);
assert.equal(db.tables.commerce_products.filter((product) => product.group_slug === 'field').every((product) => product.standalone === 1 && product.bundle_eligible === 0), true);

await seedCommerceCatalog(db);
assert.equal(db.tables.commerce_groups.length, 5, 'seed should be idempotent for groups');
assert.equal(db.tables.commerce_products.length, 6, 'seed should be idempotent for products');
assert.equal(db.tables.commerce_plans.length, 6, 'seed should be idempotent for plans');
assert.equal(db.tables.usage_meters.length, 5, 'seed should be idempotent for meters');

console.log('d1 commerce seed tests passed');
