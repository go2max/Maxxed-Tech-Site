import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { productSeedsFromPublicCatalog, activeProductNames } from '../src/catalog.mjs';
import { liveBoardItemsFromProducts } from '../src/live-board.mjs';
import { identityFromHeaders } from '../src/security/identity.mjs';
import { hasPermission } from '../src/security/rbac.mjs';
import { addProduct, archiveProduct, restoreProduct, transitionBetaApplication } from '../src/mutations.mjs';

const productNames = activeProductNames();
for (const expected of ['Maxxed Remote','Maxxed Compass','Maxxed Measure','Maxxed Gold Estimator','Fishing Maxxed','Rival Rush','Contract Extractor','WordPress Bulk Content Cleanup']) {
  assert.ok(productNames.includes(expected), `missing product seed: ${expected}`);
}

const viewer = { email: 'viewer@techmaxxed.com', roles: ['Analytics Viewer'], source: 'test' };
assert.equal(hasPermission(viewer, 'canReadProducts'), true);
assert.equal(hasPermission(viewer, 'canManageProducts'), false);
assert.throws(() => addProduct({ products: [], auditEvents: [] }, viewer, { slug: 'x', name: 'X' }), /Forbidden/);

const owner = { email: 'owner@techmaxxed.com', roles: ['Owner'], source: 'test' };
let state = { products: productSeedsFromPublicCatalog(), betaApplications: [{ id: 'beta_1', email: 'tester@example.com', status: 'New application' }], auditEvents: [] };
state = addProduct(state, owner, { slug: 'test-product', name: 'Test Product', lifecycle: 'development' }, 'test add');
assert.ok(state.products.find((product) => product.slug === 'test-product'));
assert.equal(state.auditEvents.at(-1).action, 'product.add');

const added = state.products.find((product) => product.slug === 'test-product');
state = archiveProduct(state, owner, added.id, 'No longer active');
assert.equal(state.products.find((product) => product.id === added.id).archived, true);
assert.equal(state.auditEvents.at(-1).action, 'product.archive');

state = restoreProduct(state, owner, added.id, 'Restore for testing');
assert.equal(state.products.find((product) => product.id === added.id).archived, false);
assert.equal(state.auditEvents.at(-1).action, 'product.restore');

state = transitionBetaApplication(state, owner, 'beta_1', 'Manual review pending', 'ready for review');
assert.equal(state.betaApplications[0].status, 'Manual review pending');
assert.equal(state.auditEvents.at(-1).action, 'beta.transition');

const liveBoard = liveBoardItemsFromProducts(productSeedsFromPublicCatalog(), '2026-06-29T18:20:00-07:00');
const contractExtractor = liveBoard.find((item) => item.slug === 'contract-extractor');
assert.equal(contractExtractor.onlineState, 'testing');
assert.equal(contractExtractor.health, 'green');
assert.equal(contractExtractor.lastTestStatus, 'pass');
assert.equal(contractExtractor.manualOverride, true);
assert.ok(liveBoard.some((item) => item.type === 'wordpress_plugin'), 'live board should include plugin inventory items');

const mockIdentity = identityFromHeaders({}, { ADMIN_ALLOW_MOCK_IDENTITY: 'true', ADMIN_ENV: 'development', ADMIN_MOCK_EMAIL: 'owner@techmaxxed.com', ADMIN_MOCK_ROLES: 'Owner' });
assert.equal(mockIdentity.email, 'owner@techmaxxed.com');
assert.throws(() => identityFromHeaders({}, { ADMIN_ALLOW_MOCK_IDENTITY: 'true', ADMIN_ENV: 'production' }), /must not be enabled/);

const schema = await readFile('admin/db/schema.sql', 'utf8');
for (const table of ['products','beta_applications','release_records','support_cases','known_issues','monitoring_checks','readiness_gates','integration_status','audit_events']) {
  assert.ok(schema.includes(`CREATE TABLE IF NOT EXISTS ${table}`), `schema missing ${table}`);
}

console.log('admin tests passed');
