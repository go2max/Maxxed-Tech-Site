CREATE TABLE IF NOT EXISTS test_jobs (
  id TEXT PRIMARY KEY,
  app_id TEXT NOT NULL,
  suite_id TEXT,
  script_ids TEXT NOT NULL,
  state TEXT NOT NULL CHECK (state IN ('queued', 'leased', 'running', 'completed', 'failed', 'blocked', 'interrupted')),
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL,
  started_at TEXT,
  completed_at TEXT,
  result_summary TEXT
);

CREATE INDEX IF NOT EXISTS test_jobs_created_at_idx
  ON test_jobs(created_at DESC);

CREATE TABLE IF NOT EXISTS audit_events (
  id TEXT PRIMARY KEY,
  actor_email TEXT NOT NULL,
  action TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  details TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS audit_events_created_at_idx
  ON audit_events(created_at DESC);
