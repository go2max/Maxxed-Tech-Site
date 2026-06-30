import assert from 'node:assert/strict';
import { latestCommerceEvents, sampleCommerceEvents, summarizeCommerceEvents, webhookReadiness } from '../src/commerce-event-status.mjs';

const sampleSummary = summarizeCommerceEvents(sampleCommerceEvents);
assert.equal(sampleSummary.total, 3);
assert.equal(sampleSummary.counts.processed, 1);
assert.equal(sampleSummary.counts.ignored, 1);
assert.equal(sampleSummary.counts.duplicate, 1);
assert.equal(sampleSummary.counts.failed, 0);
assert.equal(sampleSummary.health, 'healthy');

const failedSummary = summarizeCommerceEvents([{ id: 'evt_failed', processingState: 'failed', receivedAt: '2026-06-30T20:00:00.000Z' }]);
assert.equal(failedSummary.health, 'needs_review');
assert.ok(failedSummary.recommendation.includes('Review failed'));

const latest = latestCommerceEvents([
  { id: 'old', receivedAt: '2026-06-30T19:00:00.000Z' },
  { id: 'new', receivedAt: '2026-06-30T21:00:00.000Z' }
]);
assert.equal(latest[0].id, 'new');

const blocked = webhookReadiness({ eventSummary: sampleSummary, hasVerifiedEndpoint: true, hasD1: false, checkoutMode: 'test' });
assert.equal(blocked.readyForTestRedirects, false);
assert.ok(blocked.blockers.includes('d1_binding_not_confirmed'));

const ready = webhookReadiness({ eventSummary: sampleSummary, hasVerifiedEndpoint: true, hasD1: true, checkoutMode: 'test' });
assert.equal(ready.readyForTestRedirects, true);

console.log('commerce event status tests passed');
