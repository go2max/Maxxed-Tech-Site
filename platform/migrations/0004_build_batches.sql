CREATE TABLE IF NOT EXISTS build_batches (
  id TEXT PRIMARY KEY,
  state TEXT NOT NULL CHECK (state IN ('queued', 'planning', 'ready', 'running', 'passed', 'failed', 'blocked', 'cancelled')),
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  title TEXT,
  summary TEXT
);

CREATE TABLE IF NOT EXISTS build_batch_items (
  id TEXT PRIMARY KEY,
  batch_id TEXT NOT NULL,
  product_id TEXT NOT NULL,
  product_name TEXT,
  decision TEXT NOT NULL CHECK (decision IN ('new-product', 'extend-existing', 'duplicate', 'needs-human-review')),
  confidence REAL NOT NULL,
  target_product_id TEXT,
  state TEXT NOT NULL CHECK (state IN ('queued', 'blocked', 'planned', 'ready', 'running', 'passed', 'failed', 'cancelled')),
  reasons TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY(batch_id) REFERENCES build_batches(id)
);

CREATE INDEX IF NOT EXISTS build_batches_created_idx
  ON build_batches(created_at DESC);

CREATE INDEX IF NOT EXISTS build_batch_items_batch_idx
  ON build_batch_items(batch_id, product_id);
