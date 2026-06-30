import assert from 'node:assert/strict';
import { buildSeedReport } from '../src/seed-report.mjs';

const report = await buildSeedReport();
assert.equal(report.ok, true);
assert.equal(report.mode, 'read_only_dry_run');
assert.equal(report.blockers.length, 0);
assert.equal(report.counts.groups, 5);
assert.equal(report.counts.products, 6);
assert.equal(report.counts.plans, 6);
assert.equal(report.counts.meters, 5);
assert.equal(report.counts.productsByGroup.field, 3);
assert.equal(report.counts.plansByGroup.business, 3);
assert.equal(report.task.applied, false);
assert.equal(report.task.validation.ok, true);

console.log('seed report tests passed');
