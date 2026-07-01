CREATE TABLE IF NOT EXISTS admin_users (
  email TEXT PRIMARY KEY,
  role TEXT NOT NULL CHECK (role IN ('owner', 'builder', 'qa', 'viewer')),
  status TEXT NOT NULL CHECK (status IN ('active', 'disabled')),
  display_name TEXT,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS admin_users_role_status_idx
  ON admin_users(role, status);
