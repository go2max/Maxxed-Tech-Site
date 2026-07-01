CREATE INDEX IF NOT EXISTS audit_events_actor_created_idx
  ON audit_events(actor_email, created_at DESC);

CREATE INDEX IF NOT EXISTS audit_events_action_created_idx
  ON audit_events(action, created_at DESC);
