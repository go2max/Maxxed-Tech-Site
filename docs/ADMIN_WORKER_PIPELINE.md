# Admin Worker Pipeline

This document describes the private admin worker foundation for catalog scanning, build batch queueing, QA gates, and polish review.

## Current Scope

The admin Worker now supports:

- authenticated admin access through the forwarded `oai-authenticated-user-email` header
- role-aware admin users: `owner`, `builder`, `qa`, and `viewer`
- durable audit events for admin access and worker actions
- product catalog viewing and multi-select scanning
- deterministic build-vs-extend decisions
- durable build batches and build batch items
- allowlisted build recipe steps using `command_ref` values only
- authenticated build-runner leasing through bearer token
- QA rules before marking a batch testing-ready
- polish checklist and report endpoints
- build dashboard summary for review
- GitHub/PR metadata records for branch, PR URL, and CI state
- batch/item status rollups when build workers lease and complete approved steps

The browser never sends shell commands. It submits product IDs and approved action choices only.

## Required Bindings And Environment

Worker bindings:

- `DB`: D1 database
- `ARTIFACTS`: R2 bucket

Environment variables:

- `ADMIN_ALLOWED_EMAILS`: comma-separated fallback allowlist
- `ADMIN_OWNER_EMAILS`: comma-separated owners
- `ADMIN_BUILDER_EMAILS`: comma-separated builders
- `ADMIN_QA_EMAILS`: comma-separated QA users
- `ADMIN_VIEWER_EMAILS`: comma-separated viewers
- `RUNNER_TOKEN`: existing Android QA runner token
- `BUILD_RUNNER_TOKEN`: optional separate build runner token

If `BUILD_RUNNER_TOKEN` is not set, the build runner falls back to `RUNNER_TOKEN`.

## Migration Order

Apply migrations in order:

1. `0000_testing_jobs.sql`
2. `0001_runner_pipeline.sql`
3. `0002_admin_security_audit.sql`
4. `0003_admin_users.sql`
5. `0004_build_batches.sql`
6. `0005_build_command_contract.sql`
7. `0006_build_worker_bridge.sql`
8. `0007_testing_readiness_gate.sql`
9. `0008_polish_review.sql`
10. `0009_github_bridge.sql`

## Safe Operating Flow

1. Owner opens Settings and verifies roles.
2. Builder opens Build Catalog and selects products.
3. Builder runs Scan Selected.
4. Builder queues only non-duplicate items.
5. Trusted build runner leases `/api/build-runner/lease`.
6. Worker-visible batch and item states move to `running`.
7. Runner resolves returned `commandRef` using its own local allowlist.
8. Current runner skeleton records a dry-run blocked result. Real Codex/GitHub execution must be enabled deliberately in the runner, not from the browser.
9. Runner completes each step with a structured result summary.
10. Worker completion rolls item and batch states to `passed`, `failed`, or `blocked`.
11. QA checks `/api/build-batches/:id/readiness`.
12. Batch can be marked testing-ready only after required QA rules pass.
13. Reviewer opens polish report before distributing a tester artifact.

## Not Automated Yet

These pieces are intentionally not fully automated yet:

- actual Codex invocation from a build runner
- GitHub branch creation, commit, PR creation, and CI monitoring
- generated artifact upload for web/plugin outputs
- static admin export regeneration
- production deployment of the new Worker routes
- direct GitHub writes from the admin Worker

Those should be added after this foundation is reviewed and the live-report changes are separated or intentionally included.

## Verification Commands

Run the safe checks:

```sh
npm --prefix platform run check
npm run check:runner
npm run check:build-runner
npm run check:pipeline
```

Avoid running the root build while unrelated admin static output is dirty unless that regeneration is intentional.
