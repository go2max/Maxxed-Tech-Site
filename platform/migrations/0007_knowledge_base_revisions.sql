CREATE TABLE IF NOT EXISTS knowledge_base_revisions (
  id TEXT PRIMARY KEY,
  entry_id TEXT NOT NULL,
  revision_number INTEGER NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  section TEXT NOT NULL,
  classification TEXT NOT NULL,
  audience TEXT NOT NULL,
  product_id TEXT NOT NULL,
  change_summary TEXT NOT NULL,
  workflow_state TEXT NOT NULL,
  author_email TEXT NOT NULL,
  reviewer_email TEXT NOT NULL,
  submitted_at TEXT NOT NULL,
  published_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS knowledge_base_revisions_number
  ON knowledge_base_revisions (entry_id, revision_number);

CREATE INDEX IF NOT EXISTS knowledge_base_revisions_state
  ON knowledge_base_revisions (workflow_state, updated_at);

CREATE INDEX IF NOT EXISTS knowledge_base_revisions_entry
  ON knowledge_base_revisions (entry_id, created_at);
