import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const html = await readFile('admin/report/index.html', 'utf8');
assert.ok(html.includes('Seed Readiness Report'));
assert.ok(html.includes('/api/report/seed'));
assert.ok(html.includes('noindex,nofollow'));
assert.ok(html.includes('Read-only view'));
assert.ok(html.includes('Catalog Counts'));
assert.ok(html.includes('Blockers'));

console.log('admin report page tests passed');
