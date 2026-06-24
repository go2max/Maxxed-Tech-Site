-- 0003_test_evidence_objects.sql
-- Private test evidence metadata. Binary content remains in private object storage.

CREATE TABLE IF NOT EXISTS test_evidence_objects (
  id TEXT PRIMARY KEY,
  job_id TEXT NOT NULL,
  step_id TEXT NOT NULL,
  artifact_name TEXT NOT NULL,
  object_key TEXT NOT NULL UNIQUE,
  content_type TEXT NOT NULL,
  byte_size INTEGER NOT NULL,
  sha256 TEXT NOT NULL,
  storage_state TEXT NOT NULL,
  retention_until TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS test_evidence_job
  ON test_evidence_objects (job_id, created_at);

CREATE INDEX IF NOT EXISTS test_evidence_retention
  ON test_evidence_objects (storage_state, retention_until);
