# Runner Fleet Operations

This runbook covers runner identity, fleet health, credential rotation, schema
deployment, and test result inspection for the private testing control plane.

## Deployment Order

1. Merge and deploy the platform code.
2. Allow the platform migration runner to apply
   `platform/migrations/0002_runner_nodes.sql`.
3. Confirm `runner_nodes` and its identity and last-seen indexes exist.
4. Configure per-runner tokens in hosted secret management.
5. Update one runner at a time and confirm it appears online in Testing
   Functions.
6. Remove the legacy shared token after every expected runner is visible.

The migration is additive and idempotent. It does not rewrite automation jobs,
results, evidence indexes, or audit events.

## Per-Runner Credentials

`RUNNER_API_TOKENS_JSON` is a secret JSON object keyed by exact runner ID.
Each value can be one token or an array containing the current and next token.
Tokens must contain at least 32 characters. At most two tokens are accepted per
runner.

When the mapping is non-empty, the legacy `RUNNER_API_TOKEN` is ignored for
runner requests. A token assigned to one runner cannot authenticate a payload
claiming another runner ID.

### Rotation

1. Generate the next token in secret management.
2. Add it as the second token for that runner and deploy the platform secret.
3. Replace `MAXXED_RUNNER_API_TOKEN` on that runner.
4. Restart the runner and confirm a fresh check-in.
5. Remove the old token from the hosted mapping.

This permits rotation without making queued work available to a shared fleet
credential. Never place either token in Git, local JSON config, task arguments,
reports, or logs.

## Fleet Health

Every claim poll records a runner check-in, including idle polls. Active job
heartbeats and completion also refresh the node. The node record contains:

- runner and Android device IDs
- advertised product IDs
- runner agent version
- last-seen and update timestamps

Testing Functions classifies nodes as:

- `online`: seen within `RUNNER_FLEET_STALE_MS`
- `stale`: older than the stale threshold but within the offline threshold
- `offline`: older than `RUNNER_FLEET_OFFLINE_MS`

Defaults are two minutes and ten minutes. The offline threshold must be greater
than the stale threshold. Fleet heartbeats are operational state and are not
written to the append-only security audit on every poll.

## Job Detail and Export

Select a job ID from Recent test jobs to open its detail view. The page shows:

- app, state, runner, device, and timestamps
- server-approved ordered steps
- completed step outcomes and exit codes
- the bounded evidence index
- escaped raw result JSON

Use **Download result JSON** for a no-store authenticated export. The export is
an index and result record; local screenshots, logcat, UI XML, and other binary
evidence remain on the isolated runner at their recorded references.

All database-controlled fields are HTML-escaped. Detail and export routes
require the same QA assignment permission as Testing Functions.

## Incident Response

### Unknown Runner

- remove its token mapping immediately
- preserve platform request logs and runner-node timestamps
- inspect audit events for claimed, completed, retried, or cancelled jobs
- rotate any token that may have been copied to another machine

### Stale or Offline Runner

- run the agent `--check` preflight
- confirm the Windows task or service account is running
- verify HTTPS access and system time
- confirm the local runner ID exactly matches the hosted token-map key
- verify its artifact catalog still advertises the expected products

### Result Without Local Evidence

- preserve the result JSON export
- inspect the runner report directory from the evidence references
- do not convert missing local files into passing evidence
- retry as a new job after correcting report storage

## Validation

```powershell
npm run check
node scripts/security-scan.mjs
```

The automated suite covers migration idempotency, memory and D1 persistence,
runner-token isolation and staged rotation, idle and active fleet updates,
health rendering, result downloads, stored-content escaping, and credential
redaction.
