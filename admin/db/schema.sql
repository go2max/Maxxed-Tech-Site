-- Maxxed Admin Platform v1 D1/SQLite-compatible schema.
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS access_users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  display_name TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','disabled','removed')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_by TEXT,
  updated_by TEXT
);

CREATE TABLE IF NOT EXISTS access_role_assignments (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES access_users(id),
  role TEXT NOT NULL CHECK (role IN ('Owner','Administrator','Developer','QA Lead','Beta Manager','Support','Documentation Editor','Analytics Viewer')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','revoked')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_by TEXT
);

CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  short_name TEXT,
  category TEXT,
  package_id TEXT,
  lifecycle TEXT NOT NULL,
  public_status TEXT,
  current_track TEXT,
  latest_version_name TEXT,
  latest_version_code INTEGER,
  public_url TEXT,
  privacy_url TEXT,
  support_url TEXT,
  source_status TEXT NOT NULL DEFAULT 'not_configured',
  notes TEXT,
  sort_order INTEGER NOT NULL DEFAULT 100,
  archived INTEGER NOT NULL DEFAULT 0,
  archived_at TEXT,
  archived_by TEXT,
  archive_reason TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_by TEXT,
  updated_by TEXT
);

CREATE TABLE IF NOT EXISTS product_links (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL REFERENCES products(id),
  label TEXT NOT NULL,
  url TEXT NOT NULL,
  source_status TEXT NOT NULL DEFAULT 'not_configured',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS beta_applications (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  display_name TEXT,
  requested_products TEXT NOT NULL DEFAULT '[]',
  status TEXT NOT NULL,
  tester_access_consent INTEGER NOT NULL DEFAULT 0,
  public_credit_consent INTEGER NOT NULL DEFAULT 0,
  public_credit_name TEXT,
  admin_notes TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_by TEXT,
  updated_by TEXT
);

CREATE TABLE IF NOT EXISTS beta_status_events (
  id TEXT PRIMARY KEY,
  beta_application_id TEXT NOT NULL REFERENCES beta_applications(id),
  from_status TEXT,
  to_status TEXT NOT NULL,
  reason TEXT,
  actor_email TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS tester_enrollments (
  id TEXT PRIMARY KEY,
  beta_application_id TEXT REFERENCES beta_applications(id),
  product_id TEXT REFERENCES products(id),
  status TEXT NOT NULL,
  google_group_email TEXT,
  opt_in_link TEXT,
  public_credit_status TEXT NOT NULL DEFAULT 'not_requested',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS release_records (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL REFERENCES products(id),
  package_id TEXT,
  version_name TEXT,
  version_code INTEGER,
  artifact_sha256 TEXT,
  artifact_size_bytes INTEGER,
  signing_cert_sha256 TEXT,
  signer_match_state TEXT NOT NULL DEFAULT 'not_run',
  debuggable_state TEXT NOT NULL DEFAULT 'not_run',
  manifest_permission_summary TEXT,
  min_sdk INTEGER,
  target_sdk INTEGER,
  release_notes TEXT,
  play_track TEXT,
  rollout_percentage REAL,
  approval_status TEXT NOT NULL DEFAULT 'draft',
  approved_by TEXT,
  approved_at TEXT,
  blocker_notes TEXT,
  source_status TEXT NOT NULL DEFAULT 'not_configured',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS release_gate_results (
  id TEXT PRIMARY KEY,
  release_id TEXT NOT NULL REFERENCES release_records(id),
  gate_key TEXT NOT NULL,
  gate_name TEXT NOT NULL,
  state TEXT NOT NULL CHECK (state IN ('not_run','pass','fail','blocked','insufficient_data','unavailable','not_configured')),
  evidence_url TEXT,
  notes TEXT,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS support_cases (
  id TEXT PRIMARY KEY,
  product_id TEXT REFERENCES products(id),
  version_name TEXT,
  device TEXT,
  android_version TEXT,
  requester_email TEXT,
  severity TEXT NOT NULL DEFAULT 'normal',
  status TEXT NOT NULL DEFAULT 'open',
  summary TEXT NOT NULL,
  detail TEXT,
  linked_release_id TEXT REFERENCES release_records(id),
  linked_known_issue_id TEXT,
  admin_notes TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS known_issues (
  id TEXT PRIMARY KEY,
  product_id TEXT REFERENCES products(id),
  severity TEXT NOT NULL DEFAULT 'normal',
  affected_versions TEXT,
  status TEXT NOT NULL DEFAULT 'open',
  visibility TEXT NOT NULL DEFAULT 'private',
  summary TEXT NOT NULL,
  workaround TEXT,
  release_blocker INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS monitoring_checks (
  id TEXT PRIMARY KEY,
  product_id TEXT REFERENCES products(id),
  check_key TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  target_url TEXT,
  expected_marker TEXT,
  cadence TEXT NOT NULL DEFAULT 'manual',
  source_status TEXT NOT NULL DEFAULT 'not_configured',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS monitoring_results (
  id TEXT PRIMARY KEY,
  check_id TEXT NOT NULL REFERENCES monitoring_checks(id),
  state TEXT NOT NULL CHECK (state IN ('not_run','pass','fail','blocked','insufficient_data','unavailable','not_configured')),
  response_ms INTEGER,
  checked_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  detail TEXT
);

CREATE TABLE IF NOT EXISTS readiness_gates (
  id TEXT PRIMARY KEY,
  product_id TEXT REFERENCES products(id),
  gate_key TEXT NOT NULL,
  gate_name TEXT NOT NULL,
  state TEXT NOT NULL CHECK (state IN ('not_run','pass','fail','blocked','insufficient_data','unavailable','not_configured')),
  mandatory INTEGER NOT NULL DEFAULT 1,
  evidence_url TEXT,
  notes TEXT,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS integration_status (
  id TEXT PRIMARY KEY,
  integration_key TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  state TEXT NOT NULL CHECK (state IN ('configured','not_configured','unavailable','blocked','insufficient_data')),
  last_sync_at TEXT,
  last_error TEXT,
  credential_source_name TEXT,
  required_env TEXT NOT NULL DEFAULT '[]',
  notes TEXT,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS audit_events (
  id TEXT PRIMARY KEY,
  actor_email TEXT NOT NULL,
  actor_role TEXT,
  action TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id TEXT,
  before_summary TEXT,
  after_summary TEXT,
  reason TEXT,
  request_id TEXT,
  source TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS admin_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_by TEXT
);
