# Commerce Seed SQL

This branch expands `admin/db/commerce-seed.sql` so the D1 seed artifact covers the full commerce catalog baseline.

## Added to SQL seed

- Commerce groups
- Commerce products
- Commerce plans
- Usage meters

All seed blocks use repeatable upsert behavior so the artifact can be safely reapplied after schema migration.

## Added validation

`admin/tests/commerce-seed-sql.test.mjs` checks:

- Required table insert blocks are present.
- Repeatable conflict handling is present.
- Product support routing remains on `support@techmaxxed.com`.
- Field products are represented.
- Business usage billing plans are represented.
- Storage metering is represented.

## Suggested local checks

```bash
node admin/tests/commerce-seed-sql.test.mjs
node admin/tests/d1-commerce-seeds.test.mjs
node admin/tests/d1-commerce-adapter.test.mjs
node admin/tests/commerce.test.mjs
npm run check
```
