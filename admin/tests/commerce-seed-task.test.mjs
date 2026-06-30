import assert from 'node:assert/strict';
import { commerceSeedTask, validateSeedSql } from '../src/commerce-seed-task.mjs';

const validSql = await import('node:fs/promises').then(({ readFile }) => readFile('admin/db/commerce-seed.sql', 'utf8'));
const validation = validateSeedSql(validSql);
assert.equal(validation.ok, true);
assert.equal(validation.checks.every((check) => check.ok), true);

const invalid = validateSeedSql('INSERT INTO commerce_groups VALUES ();');
assert.equal(invalid.ok, false);
assert.equal(invalid.checks.find((check) => check.key === 'products_block').ok, false);

const dryRun = await commerceSeedTask({ dryRun: true });
assert.equal(dryRun.ok, true);
assert.equal(dryRun.dryRun, true);
assert.equal(dryRun.applied, false);
assert.equal(dryRun.validation.ok, true);
assert.equal(dryRun.summary.products, 6);

const noDb = await commerceSeedTask({ dryRun: false, db: null });
assert.equal(noDb.ok, true);
assert.equal(noDb.dryRun, true);
assert.equal(noDb.applied, false);

console.log('commerce seed task tests passed');
