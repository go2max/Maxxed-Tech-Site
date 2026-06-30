import assert from 'node:assert/strict';
import { parseVerifiedEventPayload } from '../src/verified-event-ingest.mjs';

const good = parseVerifiedEventPayload(JSON.stringify({ id: 'evt_basic', type: 'customer.subscription.updated' }));
assert.equal(good.ok, true);
assert.equal(good.event.id, 'evt_basic');

const bad = parseVerifiedEventPayload('{not-json');
assert.equal(bad.ok, false);
assert.equal(bad.error, 'invalid_event_json');

console.log('verified event basic tests passed');
