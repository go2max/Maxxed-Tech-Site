CREATE TABLE IF NOT EXISTS beta_enrollment_events (
  id TEXT PRIMARY KEY,
  beta_application_id TEXT NOT NULL,
  email TEXT NOT NULL,
  event_type TEXT NOT NULL,
  product_slug TEXT NOT NULL,
  track_name TEXT NOT NULL,
  actor_email TEXT NOT NULL,
  details_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS beta_enrollment_events_application
  ON beta_enrollment_events (beta_application_id, created_at);

CREATE INDEX IF NOT EXISTS beta_enrollment_events_email
  ON beta_enrollment_events (email, created_at);

CREATE TABLE IF NOT EXISTS beta_track_syncs (
  id TEXT PRIMARY KEY,
  product_slug TEXT NOT NULL,
  track_name TEXT NOT NULL,
  group_email TEXT NOT NULL,
  sync_state TEXT NOT NULL,
  external_reference TEXT NOT NULL,
  details_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS beta_track_syncs_track
  ON beta_track_syncs (product_slug, track_name, sync_state);

CREATE TABLE IF NOT EXISTS beta_data_requests (
  id TEXT PRIMARY KEY,
  beta_application_id TEXT NOT NULL,
  email TEXT NOT NULL,
  request_type TEXT NOT NULL,
  status TEXT NOT NULL,
  requested_by TEXT NOT NULL,
  details_json TEXT NOT NULL,
  resolved_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS beta_data_requests_status
  ON beta_data_requests (status, request_type, created_at);
