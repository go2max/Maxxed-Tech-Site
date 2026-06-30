export const eventStates = ['processed', 'ignored', 'failed', 'duplicate', 'received'];

export const sampleCommerceEvents = [
  {
    id: 'evt_sample_processed_checkout',
    eventType: 'checkout.session.completed',
    processingState: 'processed',
    livemode: false,
    receivedAt: '2026-06-30T19:45:00.000Z',
    processedAt: '2026-06-30T19:45:01.000Z',
    resultSummary: 'Subscription and entitlement preview processed.',
    errorMessage: ''
  },
  {
    id: 'evt_sample_ignored_unknown',
    eventType: 'customer.source.updated',
    processingState: 'ignored',
    livemode: false,
    receivedAt: '2026-06-30T19:48:00.000Z',
    processedAt: '2026-06-30T19:48:00.000Z',
    resultSummary: 'Unsupported event type ignored without entitlement mutation.',
    errorMessage: ''
  },
  {
    id: 'evt_sample_duplicate_retry',
    eventType: 'customer.subscription.updated',
    processingState: 'duplicate',
    livemode: false,
    receivedAt: '2026-06-30T19:51:00.000Z',
    processedAt: '2026-06-30T19:51:00.000Z',
    resultSummary: 'Duplicate delivery skipped by event idempotency.',
    errorMessage: ''
  }
];

export function normalizeEventState(state) {
  return eventStates.includes(state) ? state : 'received';
}

export function summarizeCommerceEvents(events = []) {
  const counts = Object.fromEntries(eventStates.map((state) => [state, 0]));
  for (const event of events) {
    counts[normalizeEventState(event.processingState)] += 1;
  }
  const total = events.length;
  const failureRate = total ? counts.failed / total : 0;
  const duplicateRate = total ? counts.duplicate / total : 0;
  const ignoredRate = total ? counts.ignored / total : 0;
  const health = counts.failed > 0 ? 'needs_review' : counts.processed > 0 ? 'healthy' : 'not_started';
  return {
    total,
    counts,
    failureRate,
    duplicateRate,
    ignoredRate,
    health,
    recommendation: counts.failed > 0
      ? 'Review failed webhook events before enabling customer-facing checkout redirects.'
      : total === 0
        ? 'No verified commerce events recorded yet. Keep checkout in test mode.'
        : 'Event ingestion looks acceptable for continued test-mode rollout.'
  };
}

export function latestCommerceEvents(events = [], limit = 10) {
  return [...events]
    .sort((a, b) => String(b.receivedAt || '').localeCompare(String(a.receivedAt || '')))
    .slice(0, limit);
}

export function webhookReadiness({ eventSummary = summarizeCommerceEvents(), hasVerifiedEndpoint = true, hasD1 = false, checkoutMode = 'test' } = {}) {
  const blockers = [];
  if (!hasVerifiedEndpoint) blockers.push('verified_endpoint_missing');
  if (!hasD1) blockers.push('d1_binding_not_confirmed');
  if (checkoutMode !== 'test') blockers.push('checkout_not_in_test_mode');
  if (eventSummary.counts.failed > 0) blockers.push('failed_events_present');
  return {
    readyForTestRedirects: blockers.length === 0,
    blockers,
    recommendation: blockers.length
      ? `Resolve ${blockers.join(', ')} before wiring customer checkout buttons.`
      : 'Ready to wire limited customer-facing test checkout redirects.'
  };
}
