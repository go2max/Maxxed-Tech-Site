# Readiness, Security, and Monitoring Operations

## Purpose

The private platform calculates release readiness from current evidence and exposes a single security posture view for scan findings, monitored dependencies, certificate and uptime checks, backup health, access changes, and audit integrity.

## Product Readiness

Open `/readiness` with a role that has `readiness.read`.

Users with `readiness.write` can:

1. Record evidence against one of the eight weighted categories.
2. Mark evidence as a mandatory gate and provide a stable gate key.
3. Set an expiration time for evidence that must be refreshed.
4. Calculate a new immutable snapshot for a target release stage.

The server calculates every score. Browser-supplied scores are not accepted by the calculated-snapshot endpoint.

Stage thresholds are:

- Development: 0
- Internal QA: 50
- Internal beta: 70
- Closed beta: 80
- Open beta: 90
- Production: 95

A passing percentage never overrides a failed or missing mandatory gate. Expired evidence is treated as blocked.

## Security Monitoring

Open `/security/monitoring` with a role that has `audit.read`.

The dashboard includes:

- append-only audit-chain verification
- dependency, secret, certificate, availability, privacy, artifact, and access findings
- uptime, certificate, privacy URL, Play listing, dependency scan, secret scan, backup restore, and audit-integrity monitor results
- backup verification freshness
- persistent role changes
- critical, degraded, and healthy posture states

Users with `integrations.write` can ingest bounded monitor results and scanner findings. Findings are deduplicated by stable fingerprint and retain their original detection time. Resolution requires a summary and creates another audit event.

## Integration Contract

External monitors and CI scanners push results to the authenticated platform. The platform intentionally does not fetch operator-provided URLs, which avoids creating an SSRF path.

Monitor endpoint:

`POST /security/monitoring/checks`

Finding endpoint:

`POST /security/monitoring/findings`

Required protections are trusted identity, RBAC, session validation, same-origin enforcement, CSRF validation, request-size limits, field allowlists, and audit recording.

For machine integrations, use a narrowly scoped identity-aware proxy policy. Do not reuse human Owner credentials or store service credentials in the repository.

## Freshness

- `MONITOR_STALE_HOURS`: hours before a previously healthy result is displayed as stale; default 24, maximum 720.
- `BACKUP_HEALTH_STALE_HOURS`: hours before the latest verified backup is considered stale; default 48, maximum 720.

Reported failing, stale, or unavailable results remain unhealthy regardless of age.

## Incident Handling

1. Confirm the finding fingerprint and source.
2. Record acknowledgment or investigation through the scanner integration.
3. Link remediation evidence in the finding details.
4. Resolve only after the relevant monitor or scan has been rerun.
5. Recalculate product readiness when the finding affects a release gate.
6. Escalate critical findings or audit-chain failures through the incident runbook.

Never paste raw secrets, full tokens, private keys, or unrestricted logs into finding details.
