import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const script = await readFile('scripts/admin-deploy-checks.mjs', 'utf8');
const required = [
  'report-deploy-manifest.test.mjs',
  'report-worker.test.mjs',
  'admin-report-page.test.mjs',
  'seed-report.test.mjs',
  'admin-deploy-checklist.test.mjs',
  'public-admin-link-guard.test.mjs'
];
for (const item of required) assert.ok(script.includes(item), `missing ${item}`);
assert.ok(script.includes('spawnSync'));
assert.ok(script.includes('process.exitCode = 1'));

console.log('admin deploy runner tests passed');
