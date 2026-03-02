ALTER TABLE drafts ADD COLUMN approved_by TEXT;
ALTER TABLE drafts ADD COLUMN approved_at TEXT;
ALTER TABLE drafts ADD COLUMN rejection_reason TEXT;

CREATE TABLE IF NOT EXISTS webhook_attempts (
  id TEXT PRIMARY KEY,
  subsidiary_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  event_id TEXT NOT NULL,
  url TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  attempt INTEGER NOT NULL DEFAULT 1,
  response_code INTEGER,
  error_message TEXT,
  next_retry_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  delivered_at TEXT,
  UNIQUE(event_type, event_id, url, attempt)
);
