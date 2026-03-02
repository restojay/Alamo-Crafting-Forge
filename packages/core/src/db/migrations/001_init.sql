CREATE TABLE IF NOT EXISTS subsidiaries (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  config_json TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS email_accounts (
  id TEXT PRIMARY KEY,
  subsidiary_id TEXT NOT NULL REFERENCES subsidiaries(id),
  address TEXT NOT NULL,
  credential_key TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS tickets (
  id TEXT PRIMARY KEY,
  subsidiary_id TEXT NOT NULL,
  email_id TEXT NOT NULL UNIQUE,
  subject TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_name TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'open',
  assigned_to TEXT,
  sla_deadline TEXT,
  first_response_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  ticket_id TEXT REFERENCES tickets(id),
  subsidiary_id TEXT NOT NULL,
  category TEXT NOT NULL,
  state TEXT NOT NULL DEFAULT 'new',
  description TEXT NOT NULL,
  urgency INTEGER NOT NULL DEFAULT 0,
  dedupe_hash TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS drafts (
  id TEXT PRIMARY KEY,
  ticket_id TEXT NOT NULL REFERENCES tickets(id),
  body TEXT NOT NULL,
  approved INTEGER NOT NULL DEFAULT 0,
  rejected_at TEXT,
  edited_body TEXT,
  sent_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS contacts (
  id TEXT PRIMARY KEY,
  subsidiary_id TEXT NOT NULL,
  email TEXT NOT NULL,
  name TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(subsidiary_id, email)
);

CREATE TABLE IF NOT EXISTS audit_log (
  id TEXT PRIMARY KEY,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  action TEXT NOT NULL,
  payload_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS processed_emails (
  email_id TEXT PRIMARY KEY,
  status TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sync_state (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
