import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const manifest = JSON.parse(await readFile('admin/deploy/report-worker.json', 'utf8'));
assert.equal(manifest.entrypoint, 'admin/api/report-worker.mjs');
assert.equal(manifest.route, 'admin.techmaxxed.com/api/report/*');
assert.equal(manifest.staticPage, 'admin/report/index.html');
assert.equal(manifest.staticPath, '/admin/report/');
assert.equal(manifest.access.required, true);
assert.equal(manifest.behavior.readOnly, true);
assert.equal(manifest.behavior.databaseWrites, false);
assert.equal(manifest.behavior.publicNavigation, false);
assert.equal(manifest.behavior.checkoutEnabled, false);
assert.ok(manifest.checks.includes('node admin/tests/report-worker.test.mjs'));
assert.ok(manifest.checks.includes('node admin/tests/admin-report-page.test.mjs'));

console.log('report deploy manifest tests passed');
