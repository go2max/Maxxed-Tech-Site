import assert from 'node:assert/strict';
import { handleReportRequest } from '../api/report-worker.mjs';

const okResponse = await handleReportRequest(new Request('https://admin.techmaxxed.com/api/report/seed'));
assert.equal(okResponse.status, 200);
const body = await okResponse.json();
assert.equal(body.ok, true);
assert.equal(body.mode, 'read_only_dry_run');
assert.equal(body.counts.products, 6);
assert.equal(body.counts.plans, 6);
assert.equal(body.task.applied, false);

const missingResponse = await handleReportRequest(new Request('https://admin.techmaxxed.com/api/report/missing'));
assert.equal(missingResponse.status, 404);

console.log('report worker tests passed');
