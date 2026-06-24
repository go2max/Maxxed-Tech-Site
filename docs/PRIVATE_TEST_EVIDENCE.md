# Private Test Evidence

The testing platform stores test result metadata in D1 and binary evidence in the
private `PLATFORM_EVIDENCE` R2 binding. Evidence has no public URL. Authenticated
administrators download it through the Testing Functions job detail page, where
the Worker rechecks the stored byte count and SHA-256 digest before returning it.

## Hosted configuration

Bind a private R2 bucket as `PLATFORM_EVIDENCE`. Do not expose the bucket through
an R2 public domain or custom domain.

Set these Worker variables:

- `EVIDENCE_MAX_BYTES`: maximum bytes per object; default 26214400 (25 MiB),
  hard maximum 104857600 (100 MiB).
- `EVIDENCE_RETENTION_DAYS`: retention assigned at upload; default 30, hard
  maximum 3650.
- `RUNNER_API_TOKENS_JSON`: per-runner token map. The legacy shared token is
  supported only when the map is absent.

Apply `platform/migrations/0003_test_evidence_objects.sql` before enabling
uploads. Production fails closed with HTTP 503 if the private bucket binding is
missing.

## Data flow

1. A runner with the active job lease uploads each local evidence file with its
   runner identity, step ID, and bearer credential.
2. The Worker validates lease ownership, name, MIME type, and size limits, then
   streams the bounded body into private object storage.
3. D1 receives the server-generated object key, SHA-256 digest, size, MIME type,
   retention deadline, and an audit event.
4. Job completion references only `evidence:<id>`; runner responses never expose
   the object key.
5. An authenticated Testing Functions download verifies the object against D1
   metadata and returns `Cache-Control: private, no-store`.

## Retention and incidents

An Owner invokes `POST /testing-functions/evidence/purge` with the normal
authenticated session, origin, and CSRF headers. Each invocation deletes at most
100 expired objects and records one `test_evidence.delete` audit event per
object. Schedule this endpoint through an authenticated internal maintenance
job, or invoke it from the admin tooling until a Worker cron is added.

If a download returns `evidence_integrity_failed`, stop using the affected
evidence, preserve the audit log, restrict bucket access, and compare R2 access
records with the object metadata. If an upload fails after object creation, the
Worker deletes the object before returning the error. If D1 says an object is
available but R2 does not contain it, treat that as an evidence-storage incident.

For token rotation and runner isolation, follow
`docs/RUNNER_FLEET_OPERATIONS.md`. Runner credentials belong in Windows secret
management and must never be placed in agent JSON, reports, logs, or Git.
