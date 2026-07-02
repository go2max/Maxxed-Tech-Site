ALTER TABLE build_batch_items ADD COLUMN recipe_id TEXT;

CREATE TABLE IF NOT EXISTS build_item_steps (
  id TEXT PRIMARY KEY,
  batch_id TEXT NOT NULL,
  item_id TEXT NOT NULL,
  step_index INTEGER NOT NULL,
  step_id TEXT NOT NULL,
  label TEXT NOT NULL,
  command_ref TEXT NOT NULL,
  state TEXT NOT NULL CHECK (state IN ('queued', 'blocked', 'ready', 'running', 'passed', 'failed', 'skipped', 'cancelled', 'interrupted')),
  result_json TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(item_id, step_index),
  FOREIGN KEY(batch_id) REFERENCES build_batches(id),
  FOREIGN KEY(item_id) REFERENCES build_batch_items(id)
);

CREATE INDEX IF NOT EXISTS build_item_steps_batch_idx
  ON build_item_steps(batch_id, item_id, step_index);
