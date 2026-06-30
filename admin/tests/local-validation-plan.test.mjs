import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const plan = JSON.parse(await readFile('admin/deploy/local-validation-plan.json', 'utf8'));
assert.equal(plan.name, 'admin-local-validation-plan');
assert.ok(plan.commands.includes('node scripts/admin-deploy-checks.mjs'));
assert.ok(plan.commands.includes('node scripts/commerce-seed-dry-run.mjs'));
assert.ok(plan.commands.includes('npm run check'));
assert.ok(plan.commands.length >= 9);
assert.ok(plan.expected.length >= 5);
assert.ok(plan.stopLine.length >= 4);

console.log('local validation plan tests passed');
