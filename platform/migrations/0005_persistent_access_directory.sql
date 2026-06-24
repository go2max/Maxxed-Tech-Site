-- 0005_persistent_access_directory.sql
-- Audited role events for the private identity-aware access directory.

CREATE TABLE IF NOT EXISTS access_role_events (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  role_name TEXT NOT NULL,
  action TEXT NOT NULL,
  event_sequence INTEGER NOT NULL,
  assigned_by TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS access_role_events_sequence
  ON access_role_events (event_sequence);

CREATE INDEX IF NOT EXISTS access_role_events_user
  ON access_role_events (user_id, created_at);

CREATE INDEX IF NOT EXISTS access_role_events_role
  ON access_role_events (role_name, created_at);

CREATE INDEX IF NOT EXISTS users_status
  ON users (status, email);
