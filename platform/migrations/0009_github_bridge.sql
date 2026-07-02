CREATE TABLE IF NOT EXISTS build_github_links (
  id TEXT PRIMARY KEY,
  batch_id TEXT NOT NULL,
  item_id TEXT NOT NULL,
  repository TEXT,
  branch TEXT,
  pull_request_url TEXT,
  pull_request_number INTEGER,
  ci_state TEXT CHECK (ci_state IN ('unknown', 'pending', 'passed', 'failed', 'cancelled')),
  notes TEXT,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY(batch_id) REFERENCES build_batches(id),
  FOREIGN KEY(item_id) REFERENCES build_batch_items(id)
);

CREATE INDEX IF NOT EXISTS build_github_links_item_idx
  ON build_github_links(item_id, updated_at DESC);
