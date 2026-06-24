-- 0001_initial.sql
-- Canonical D1-oriented schema for Maxxed Platform v1.

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  status TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS role_assignments (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  role_name TEXT NOT NULL,
  assigned_by TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  package_id TEXT NOT NULL,
  lifecycle_status TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS builds (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL,
  version_name TEXT NOT NULL,
  version_code INTEGER NOT NULL,
  artifact_sha256 TEXT NOT NULL,
  signer_fingerprint TEXT NOT NULL,
  signing_metadata TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS releases (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL,
  build_id TEXT NOT NULL,
  stage TEXT NOT NULL,
  qa_approval_state TEXT NOT NULL,
  owner_approval_state TEXT NOT NULL,
  release_notes TEXT NOT NULL,
  blockers_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS qa_plans (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL,
  version_label TEXT NOT NULL,
  assignments_json TEXT NOT NULL,
  test_cases_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS qa_executions (
  id TEXT PRIMARY KEY,
  qa_plan_id TEXT NOT NULL,
  assignee_email TEXT NOT NULL,
  result_state TEXT NOT NULL,
  evidence_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS bugs (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL,
  severity TEXT NOT NULL,
  priority TEXT NOT NULL,
  status TEXT NOT NULL,
  owner_email TEXT NOT NULL,
  verification_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS beta_applications (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  device_json TEXT NOT NULL,
  interests_json TEXT NOT NULL,
  status TEXT NOT NULL,
  credits_json TEXT NOT NULL,
  consent_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS beta_feedback (
  id TEXT PRIMARY KEY,
  beta_application_id TEXT,
  email TEXT NOT NULL,
  product_slug TEXT NOT NULL,
  feedback TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS automation_jobs (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL,
  ordered_steps_json TEXT NOT NULL,
  device_id TEXT NOT NULL,
  runner_id TEXT NOT NULL,
  lease_state TEXT NOT NULL,
  result_json TEXT NOT NULL,
  evidence_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS support_cases (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  subject TEXT NOT NULL,
  status TEXT NOT NULL,
  details TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS incidents (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL,
  severity TEXT NOT NULL,
  status TEXT NOT NULL,
  evidence_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS integration_states (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL,
  monitor_name TEXT NOT NULL,
  freshness_state TEXT NOT NULL,
  details_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS knowledge_base_entries (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  publication_state TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS readiness_snapshots (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL,
  score INTEGER NOT NULL,
  mandatory_gates_json TEXT NOT NULL,
  evidence_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS audit_events (
  id TEXT PRIMARY KEY,
  actor_email TEXT NOT NULL,
  actor_roles_json TEXT NOT NULL,
  trusted_subject TEXT NOT NULL,
  request_id TEXT NOT NULL,
  action_name TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  outcome TEXT NOT NULL,
  before_json TEXT NOT NULL,
  after_json TEXT NOT NULL,
  previous_hash TEXT,
  event_hash TEXT NOT NULL,
  created_at TEXT NOT NULL
);
