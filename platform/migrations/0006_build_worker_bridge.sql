ALTER TABLE build_item_steps ADD COLUMN leased_by TEXT;
ALTER TABLE build_item_steps ADD COLUMN lease_expires_at TEXT;
ALTER TABLE build_item_steps ADD COLUMN started_at TEXT;
ALTER TABLE build_item_steps ADD COLUMN completed_at TEXT;

CREATE TABLE IF NOT EXISTS build_worker_runs (
  id TEXT PRIMARY KEY,
  batch_id TEXT NOT NULL,
  item_id TEXT NOT NULL,
  step_id TEXT NOT NULL,
  runner_id TEXT NOT NULL,
  command_ref TEXT NOT NULL,
  state TEXT NOT NULL CHECK (state IN ('leased', 'running', 'passed', 'failed', 'blocked', 'interrupted')),
  result_json TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY(batch_id) REFERENCES build_batches(id),
  FOREIGN KEY(item_id) REFERENCES build_batch_items(id),
  FOREIGN KEY(step_id) REFERENCES build_item_steps(id)
);

CREATE INDEX IF NOT EXISTS build_worker_runs_created_idx
  ON build_worker_runs(created_at DESC);
