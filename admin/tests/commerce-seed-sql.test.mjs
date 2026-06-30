import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const sql = await readFile('admin/db/commerce-seed.sql', 'utf8');

const requiredTables = ['commerce_groups', 'commerce_products', 'commerce_plans', 'usage_meters'];
for (const table of requiredTables) {
  assert.ok(sql.includes(`INSERT INTO ${table}`), `missing seed insert for ${table}`);
}

assert.ok(sql.includes('ON CONFLICT(slug) DO UPDATE SET'), 'group/product/plan seeds must be repeatable');
assert.ok(sql.includes('ON CONFLICT(meter_key) DO UPDATE SET'), 'usage meter seeds must be repeatable');
assert.equal((sql.match(/support@techmaxxed\.com/g) || []).length, 6, 'every commerce product should route support to support@techmaxxed.com');
assert.ok(sql.includes("'commerce_maxxed_measure','maxxed-measure'"), 'measure seed missing');
assert.ok(sql.includes("'commerce_gold_estimator','maxxed-gold-estimator'"), 'gold estimator seed missing');
assert.ok(sql.includes("'commerce_fishing_maxxed','fishing-maxxed'"), 'fishing seed missing');
assert.ok(sql.includes("'plan_business_pro','business-pro'"), 'business pro plan missing');
assert.ok(sql.includes("'business_plus_seats_plus_usage'"), 'business usage billing model missing');
assert.ok(sql.includes("'meter_storage_gb','storage_gb'"), 'storage meter missing');

console.log('commerce seed sql tests passed');
