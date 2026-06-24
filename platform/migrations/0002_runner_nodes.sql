-- 0002_runner_nodes.sql
-- Persistent runner fleet inventory and health.

CREATE TABLE IF NOT EXISTS runner_nodes (
  id TEXT PRIMARY KEY,
  runner_id TEXT NOT NULL,
  device_id TEXT NOT NULL,
  product_ids_json TEXT NOT NULL,
  agent_version TEXT NOT NULL,
  last_seen_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS runner_nodes_identity
  ON runner_nodes (runner_id, device_id);

CREATE INDEX IF NOT EXISTS runner_nodes_last_seen
  ON runner_nodes (last_seen_at);
