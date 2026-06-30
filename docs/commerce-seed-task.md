# Commerce Seed Task

This branch adds a safe seed task for the commerce catalog.

## Added

- `admin/src/commerce-seed-task.mjs`
  - Validates `admin/db/commerce-seed.sql`.
  - Runs dry by default.
  - Applies the D1 seed helper only when a DB binding is passed in.

- `admin/tests/commerce-seed-task.test.mjs`
  - Checks valid SQL.
  - Checks invalid SQL.
  - Checks dry-run behavior.
  - Checks no-DB fallback behavior.

- `scripts/commerce-seed-dry-run.mjs`
  - Prints the dry-run result and exits non-zero when validation fails.

## Suggested local checks

```bash
node scripts/commerce-seed-dry-run.mjs
node admin/tests/commerce-seed-task.test.mjs
node admin/tests/commerce-seed-sql.test.mjs
node admin/tests/d1-commerce-seeds.test.mjs
npm run check
```
