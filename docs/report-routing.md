# Report Routing

This note documents the read-only report worker and admin report page.

## Files

- `admin/api/report-worker.mjs`
  - Handles `GET /api/report/seed`.
  - Returns the seed readiness report.
  - Does not perform database writes.

- `admin/report/index.html`
  - Private admin page for viewing seed readiness.
  - Fetches `/api/report/seed`.
  - Uses `noindex,nofollow`.

## Routing expectation

Keep both paths behind admin access controls:

- `/api/report/seed`
- `/admin/report/`

Recommended deployment mapping:

- Worker entry: `admin/api/report-worker.mjs`
- Route: `admin.techmaxxed.com/api/report/*`
- Static page: `admin/report/index.html`

## Suggested local checks

```bash
node admin/tests/report-worker.test.mjs
node admin/tests/admin-report-page.test.mjs
node admin/tests/seed-report.test.mjs
npm run check
```
