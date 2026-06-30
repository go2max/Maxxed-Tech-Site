# Admin Event Status

This branch adds a read-only status layer for commerce event processing.

## Added

- `admin/src/commerce-event-status.mjs`
  - Normalizes processing states.
  - Summarizes processed, ignored, failed, duplicate, and received events.
  - Calculates basic rates.
  - Provides health and recommendation text.
  - Provides readiness blockers before more customer-facing flow is wired.

- `admin/tests/commerce-event-status.test.mjs`
  - Covers summary counts.
  - Covers failed-event health.
  - Covers latest-event sorting.
  - Covers readiness blocker behavior.

- `admin/data/commerce-events.json`
  - Provides sample event records so admin status can render before live database reads are connected.

## Suggested local checks

```bash
node admin/tests/commerce-event-status.test.mjs
node admin/tests/verified-event-basic.test.mjs
node admin/tests/test-checkout-client.test.mjs
node admin/tests/test-checkout-worker.test.mjs
node admin/tests/commerce-worker.test.mjs
npm run check
```
