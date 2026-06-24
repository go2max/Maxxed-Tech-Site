-- 0004_test_schedules.sql
-- Durable portfolio regression schedules dispatched by the private Worker.

CREATE TABLE IF NOT EXISTS test_schedules (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  product_ids_json TEXT NOT NULL,
  runner_id TEXT NOT NULL,
  device_id TEXT NOT NULL,
  cadence_minutes INTEGER NOT NULL,
  enabled INTEGER NOT NULL,
  next_run_at TEXT NOT NULL,
  last_run_at TEXT,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS test_schedules_due
  ON test_schedules (enabled, next_run_at);

CREATE INDEX IF NOT EXISTS test_schedules_runner
  ON test_schedules (runner_id, device_id);
