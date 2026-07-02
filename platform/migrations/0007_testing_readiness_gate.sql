ALTER TABLE build_batches ADD COLUMN testing_ready_at TEXT;
ALTER TABLE build_batches ADD COLUMN testing_ready_by TEXT;

ALTER TABLE build_batch_items ADD COLUMN qa_state TEXT;
ALTER TABLE build_batch_items ADD COLUMN qa_summary TEXT;
