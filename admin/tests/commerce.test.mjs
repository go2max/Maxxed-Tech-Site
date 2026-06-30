import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { capacityRisk, capacitySnapshot, commerceGroups, commercePlans, commerceProducts, entitlementStates, usageMeters } from '../src/commerce.mjs';

assert.ok(commerceGroups.some((group) => group.slug === 'field' && group.purchaseMode === 'standalone_first'), 'field tools must stay standalone first');
assert.ok(commerceGroups.some((group) => group.slug === 'plugins' && group.purchaseMode === 'standalone_or_bundle'), 'plugins must support standalone and bundle purchase paths');
assert.ok(commerceProducts.every((product) => product.supportEmail === 'support@techmaxxed.com'), 'all commerce support must route to support@techmaxxed.com');
assert.ok(commerceProducts.some((product) => product.slug === 'post-purge-pro' && product.demoModel !== 'none'), 'first plugin product should have a demo model');
assert.ok(commercePlans.some((plan) => plan.billingModel === 'business_plus_seats_plus_usage'), 'business plans need business + seat + usage billing');
assert.ok(entitlementStates.includes('past_due') && entitlementStates.includes('restricted'), 'auto-shutoff states are required');
assert.ok(usageMeters.some((meter) => meter.key === 'storage_gb'), 'storage usage meter is required');

const risk = capacityRisk(capacitySnapshot);
assert.ok(['ok','warning','critical'].includes(risk.diskLevel));
assert.ok(risk.recommendation.includes('Capacity') || risk.recommendation.includes('Enable') || risk.recommendation.includes('Upgrade'));

const schema = await readFile('admin/db/commerce-schema.sql', 'utf8');
for (const table of ['commerce_products','commerce_plans','business_accounts','business_seats','subscriptions','entitlements','usage_events','capacity_limits','capacity_snapshots']) {
  assert.ok(schema.includes(`CREATE TABLE IF NOT EXISTS ${table}`), `commerce schema missing ${table}`);
}

console.log('commerce tests passed');
