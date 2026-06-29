ALTER TABLE test_jobs ADD COLUMN artifact_id TEXT;
ALTER TABLE test_jobs ADD COLUMN device_serial TEXT;
ALTER TABLE test_jobs ADD COLUMN leased_by TEXT;
ALTER TABLE test_jobs ADD COLUMN lease_expires_at TEXT;
ALTER TABLE test_jobs ADD COLUMN updated_at TEXT;

CREATE TABLE IF NOT EXISTS test_artifacts (
  id TEXT PRIMARY KEY,
  app_id TEXT NOT NULL,
  file_name TEXT NOT NULL,
  object_key TEXT NOT NULL UNIQUE,
  sha256 TEXT NOT NULL,
  byte_size INTEGER NOT NULL,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS test_artifacts_app_created_idx
  ON test_artifacts(app_id, created_at DESC);

CREATE TABLE IF NOT EXISTS test_job_steps (
  id TEXT PRIMARY KEY,
  job_id TEXT NOT NULL,
  step_index INTEGER NOT NULL,
  script_id TEXT NOT NULL,
  state TEXT NOT NULL CHECK (state IN ('queued', 'running', 'passed', 'failed', 'blocked', 'manual-review', 'interrupted')),
  started_at TEXT,
  completed_at TEXT,
  exit_code INTEGER,
  result_json TEXT,
  UNIQUE(job_id, step_index),
  FOREIGN KEY(job_id) REFERENCES test_jobs(id)
);

CREATE TABLE IF NOT EXISTS runner_agents (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  device_serial TEXT,
  state TEXT NOT NULL,
  current_job_id TEXT,
  last_seen_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS device_leases (
  device_serial TEXT PRIMARY KEY,
  runner_id TEXT NOT NULL,
  job_id TEXT NOT NULL,
  lease_expires_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS test_evidence (
  id TEXT PRIMARY KEY,
  job_id TEXT NOT NULL,
  step_id TEXT,
  file_name TEXT NOT NULL,
  content_type TEXT NOT NULL,
  object_key TEXT NOT NULL UNIQUE,
  byte_size INTEGER NOT NULL,
  sha256 TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY(job_id) REFERENCES test_jobs(id)
);

CREATE INDEX IF NOT EXISTS test_steps_job_idx ON test_job_steps(job_id, step_index);
CREATE INDEX IF NOT EXISTS test_evidence_job_idx ON test_evidence(job_id, created_at);
