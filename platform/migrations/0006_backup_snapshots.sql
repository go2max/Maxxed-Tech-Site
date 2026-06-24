-- 0006_backup_snapshots.sql
-- Metadata for encrypted D1 backups stored in a separate private object bucket.

CREATE TABLE IF NOT EXISTS backup_snapshots (
  id TEXT PRIMARY KEY,
  object_key TEXT NOT NULL UNIQUE,
  plaintext_sha256 TEXT NOT NULL,
  byte_size INTEGER NOT NULL,
  table_counts_json TEXT NOT NULL,
  storage_state TEXT NOT NULL,
  created_by TEXT NOT NULL,
  verified_at TEXT,
  verification_details_json TEXT NOT NULL,
  retention_until TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS backup_snapshots_retention
  ON backup_snapshots (storage_state, retention_until);

CREATE INDEX IF NOT EXISTS backup_snapshots_created
  ON backup_snapshots (created_at);
