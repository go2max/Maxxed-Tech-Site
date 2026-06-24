CREATE TABLE IF NOT EXISTS readiness_evidence (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL,
  category TEXT NOT NULL,
  result_state TEXT NOT NULL,
  source TEXT NOT NULL,
  reference TEXT NOT NULL,
  mandatory_gate INTEGER NOT NULL,
  gate_key TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  recorded_by TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS readiness_evidence_product
  ON readiness_evidence (product_id, category, created_at);

CREATE INDEX IF NOT EXISTS readiness_evidence_expiry
  ON readiness_evidence (expires_at, result_state);

CREATE TABLE IF NOT EXISTS security_findings (
  id TEXT PRIMARY KEY,
  fingerprint TEXT NOT NULL UNIQUE,
  source TEXT NOT NULL,
  category TEXT NOT NULL,
  severity TEXT NOT NULL,
  status TEXT NOT NULL,
  title TEXT NOT NULL,
  details_json TEXT NOT NULL,
  detected_at TEXT NOT NULL,
  resolved_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS security_findings_status
  ON security_findings (status, severity, updated_at);

CREATE INDEX IF NOT EXISTS security_findings_source
  ON security_findings (source, category, updated_at);
