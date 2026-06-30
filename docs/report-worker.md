# Report Worker

This branch adds a separate read-only report worker.

## Added

- `admin/api/report-worker.mjs`
  - Exposes `GET /api/report/seed`.
  - Returns the existing seed readiness report.
  - Does not write to the database.
  - Does not change public routes.

- `admin/tests/report-worker.test.mjs`
  - Confirms the report route returns expected counts.
  - Confirms no write is applied.
  - Confirms unknown paths return 404.

## Suggested local checks

```bash
node admin/tests/report-worker.test.mjs
node admin/tests/seed-report.test.mjs
node scripts/commerce-seed-dry-run.mjs
npm run check
```
