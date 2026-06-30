import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const checklist = JSON.parse(await readFile('admin/deploy/admin-deployment-checklist.json', 'utf8'));
assert.equal(checklist.scope, 'private_admin_only');
assert.equal(checklist.requiredAccessGate, true);
assert.equal(checklist.publicExposureAllowed, false);
assert.ok(checklist.items.length >= 6);
assert.ok(checklist.items.every((item) => item.required === true));
assert.ok(checklist.items.some((item) => item.id === 'admin_access_gate'));
assert.ok(checklist.items.some((item) => item.id === 'public_links_guard'));
assert.ok(checklist.commands.includes('node admin/tests/public-admin-link-guard.test.mjs'));

const routeIndex = JSON.parse(await readFile('admin/deploy/private-route-index.json', 'utf8'));
assert.equal(routeIndex.accessRequired, true);
assert.equal(routeIndex.publicExposureAllowed, false);
assert.ok(routeIndex.routes.every((route) => route.public === false));
assert.ok(routeIndex.routes.some((route) => route.id === 'seed_report_page'));
assert.ok(routeIndex.routes.some((route) => route.id === 'seed_report_json'));

console.log('admin deploy checklist tests passed');
