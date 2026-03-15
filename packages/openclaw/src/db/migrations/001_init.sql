-- OpenClaw Hub schema v1

CREATE TABLE events (
  seq INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp TEXT NOT NULL,
  type TEXT NOT NULL,
  source TEXT NOT NULL,
  project TEXT,
  payload TEXT NOT NULL DEFAULT '{}',
  checksum TEXT NOT NULL,
  schema_version INTEGER NOT NULL DEFAULT 1
);

CREATE INDEX idx_events_type ON events(type);
CREATE INDEX idx_events_project ON events(project);
CREATE INDEX idx_events_timestamp ON events(timestamp);

CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  pid INTEGER NOT NULL,
  project TEXT NOT NULL,
  cwd TEXT NOT NULL,
  started_at TEXT NOT NULL,
  last_heartbeat TEXT NOT NULL,
  last_heartbeat_epoch INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active',
  last_activity TEXT NOT NULL DEFAULT 'Starting'
);

CREATE TABLE approvals (
  id TEXT PRIMARY KEY,
  project TEXT NOT NULL,
  title TEXT NOT NULL,
  intent TEXT NOT NULL,
  diff TEXT,
  impact TEXT NOT NULL,
  requested_by TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  ceo_response TEXT,
  created_at TEXT NOT NULL,
  decided_at TEXT
);

CREATE INDEX idx_approvals_status ON approvals(status);
CREATE INDEX idx_approvals_project ON approvals(project);

CREATE TABLE policy_decisions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  action TEXT NOT NULL,
  actor TEXT NOT NULL,
  project TEXT,
  allowed INTEGER NOT NULL,
  reason TEXT NOT NULL,
  tier TEXT NOT NULL,
  timestamp TEXT NOT NULL
);

CREATE TABLE actions (
  id TEXT PRIMARY KEY,
  action TEXT NOT NULL,
  owner TEXT NOT NULL,
  project TEXT,
  status TEXT NOT NULL DEFAULT 'open',
  deadline TEXT,
  source_meeting TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  resolved_at TEXT
);

CREATE INDEX idx_actions_status ON actions(status);
CREATE INDEX idx_actions_project ON actions(project);
