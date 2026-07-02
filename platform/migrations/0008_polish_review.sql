CREATE TABLE IF NOT EXISTS polish_reviews (
  id TEXT PRIMARY KEY,
  batch_id TEXT NOT NULL,
  item_id TEXT NOT NULL,
  state TEXT NOT NULL CHECK (state IN ('pending', 'passed', 'failed', 'blocked')),
  checklist_json TEXT NOT NULL,
  notes TEXT,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY(batch_id) REFERENCES build_batches(id),
  FOREIGN KEY(item_id) REFERENCES build_batch_items(id)
);

CREATE INDEX IF NOT EXISTS polish_reviews_batch_idx
  ON polish_reviews(batch_id, item_id);
