# Platform Rollback Strategy

Last updated: June 23, 2026

## Migration posture

- Migrations are additive-first and versioned under `platform/migrations/`.
- Destructive schema changes should be introduced as staged roll-forward migrations,
  not in-place table drops.
- The initial persistence implementation uses a deterministic in-memory database
  for repository tests and a D1-oriented SQL catalog for deployment parity.

## Rollback approach

1. Stop applying new write traffic to the affected deployment.
2. Identify the most recent known-good migration set and application commit.
3. Restore a verified backup of platform data where required.
4. Re-deploy the last known-good application commit.
5. If a schema change must be reversed, prefer a forward fix migration that
   restores compatibility over a direct destructive rollback.
6. Re-run `npm run check` and the platform persistence tests before reopening
   administrative write traffic.

## Audit constraints

- Audit events are append-only and are not rolled back by normal application
  paths.
- Corrections to audit interpretation must be recorded as additional events.
- Backup and restore validation must verify audit-chain integrity after restore.
