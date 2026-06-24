# Encrypted Backup Operations

The private platform can snapshot D1 into a versioned JSON archive, encrypt it
with AES-256-GCM, store it in a separate private R2 bucket, and perform a
non-destructive restore verification. Verification never writes to live tables.

## Hosted configuration

Create a private R2 binding named `PLATFORM_BACKUPS`. Do not enable an R2 public
domain or reuse the test-evidence bucket.

Configure these hosted values:

- `BACKUP_ENCRYPTION_KEY`: 32 random bytes encoded as Base64URL.
- `BACKUP_SCHEDULE_ENABLED=true`: enable scheduled creation and verification.
- `BACKUP_INTERVAL_HOURS`: defaults to 24; maximum 168.
- `BACKUP_RETENTION_DAYS`: defaults to 30; maximum 3650.
- `BACKUP_MAX_BYTES`: defaults to 104857600; maximum 524288000.

Generate the encryption key locally and place it directly in hosted secret
management. Never paste it into source, JSON configuration, logs, tickets, or
test evidence. Keep a separately controlled recovery copy in the approved
secret manager. Existing archives require the key that created them.

Apply `platform/migrations/0006_backup_snapshots.sql` before enabling the
schedule. Configure the Worker scheduled trigger as described in
`docs/REGRESSION_SCHEDULING.md`. The same trigger dispatches due regression jobs
and creates a backup only when its configured interval has elapsed.

## Snapshot contents

The archive contains `schema_migrations` and every registered platform table
except `backup_snapshots`, avoiding recursive backup metadata. It includes the
append-only audit log. The object key remains server-only.

Each D1 metadata record stores the plaintext SHA-256, encrypted byte size, row
count per table, retention deadline, verification state, and audit actor. Backup
objects are encrypted before leaving Worker memory.

## Restore verification

An Owner can create, verify, and purge snapshots at `/security/backups`.
Verification performs all of these checks in memory:

1. AES-GCM authentication and decryption.
2. Plaintext byte count and SHA-256 integrity.
3. Exact expected table coverage.
4. Row counts against stored metadata.
5. Full append-only audit hash-chain integrity.

A scheduled backup is verified immediately. Failures are persisted and audited.
Malformed, missing, oversized, or tampered objects fail closed.

## Disaster recovery

This release deliberately does not expose a one-click live restore. For a real
incident, isolate writes, preserve the damaged database and audit evidence,
provision a separate recovery D1 instance, decrypt through an approved offline
recovery tool using the retained key, import in dependency-aware batches, run
all migrations and integrity checks, then switch bindings only after Owner
approval. Record the recovery as an incident.

Test that process on a non-production database before relying on it for a live
event. Never test restoration by overwriting the production binding.
