# OpenClaw Integration — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild OpenClaw as two new packages (`packages/protocol-qa` and `packages/openclaw`) within the Alamo-Crafting-Forge monorepo, providing Telegram notifications and CEO approval workflows for the Boardroom QA pipeline.

**Architecture:** The protocol-qa package defines versioned event schemas and types consumed by any notification transport. The openclaw package implements the Telegram transport: sending text/approval messages, running a lightweight Hub HTTP server with SQLite-backed approvals/events/sessions, and providing CLI tools (`notify`, `await-decision`, `hub`). OpenClaw depends on protocol-qa for types but has zero dependency on ServiceBot's `packages/core` — they share infrastructure (pnpm workspace, TypeScript, better-sqlite3) but not domain logic.

**Tech Stack:** TypeScript (ESM, ES2022), better-sqlite3, Node.js built-in `http`, Vitest, pnpm workspaces

**Council Approval:** Unanimous consensus (Claude, Codex, Gemini) — 2 rounds. CEO approved Strategic classification in-session.

**Key Constraint:** OpenClaw is Boardroom ops infrastructure, NOT customer support. It shares the monorepo for infrastructure efficiency but maintains hard domain boundaries. No imports from `@servicebot/core`.

---

## File Structure

### packages/protocol-qa/

| File | Responsibility |
|-|-|
| `src/index.ts` | Public exports |
| `src/events.ts` | QA gateway event type enum + discriminated union types |
| `src/types.ts` | ProposalPack, ApprovalDecision, SessionState, PolicyDecision |
| `package.json` | `@openclaw/protocol-qa`, zero runtime deps |
| `tsconfig.json` | Extends base |
| `test/events.test.ts` | Type guard tests |
| `test/types.test.ts` | ProposalPack factory + validation tests |

### packages/openclaw/

| File | Responsibility |
|-|-|
| `src/index.ts` | Public exports |
| `src/config.ts` | Config loader (telegram-config.json + env overrides) |
| `src/types.ts` | TelegramConfig, ProjectEntry, MessageType, channels |
| `src/notify.ts` | sendText, sendApproval — Telegram Bot API integration |
| `src/logger.ts` | Append-only markdown table log |
| `src/db/database.ts` | OpenClawDatabase class — SQLite singleton |
| `src/db/migrations/001_init.sql` | Schema: events, sessions, approvals, policy_decisions, actions |
| `src/hub/event-log.ts` | appendEvent, getEvents, verifyIntegrity |
| `src/hub/approvals.ts` | createProposal, decideProposal, getPendingProposals |
| `src/hub/sessions.ts` | registerSession, heartbeat, endSession, reapDeadSessions |
| `src/hub/server.ts` | HTTP API (localhost-only, auth-gated) |
| `src/hub/auth.ts` | Token generation + validation (restrictive file perms) |
| `src/hub/delivery.ts` | Poll pending proposals → send Telegram approvals (delivery loop) |
| `src/cli/notify.ts` | CLI: `npx tsx src/cli/notify.ts <channel> <message>` |
| `src/cli/await-decision.ts` | CLI: governance approval flow with polling |
| `src/cli/hub.ts` | CLI: `npm run hub` to start the Hub server |
| `config/telegram-config.example.json` | Example config (gitignored real config) |
| `package.json` | `@openclaw/openclaw`, deps: better-sqlite3, @openclaw/protocol-qa |
| `tsconfig.json` | Extends base |
| `vitest.config.ts` | Test config |
| `test/config.test.ts` | Config loader tests |
| `test/notify.test.ts` | Notification sender tests (mocked fetch) |
| `test/logger.test.ts` | Logger tests |
| `test/db/database.test.ts` | Database lifecycle + migration tests |
| `test/hub/event-log.test.ts` | Event log CRUD + integrity tests |
| `test/hub/approvals.test.ts` | Approval lifecycle tests |
| `test/hub/sessions.test.ts` | Session management tests |
| `test/hub/server.test.ts` | HTTP API integration tests (incl. auth edge cases) |
| `test/hub/delivery.test.ts` | Delivery loop tests |
| `test/cli/await-decision.test.ts` | await-decision flow tests |
| `test/e2e/approval-flow.test.ts` | E2E: create proposal → deliver to Telegram → decide → poll returns result |

### Modified Files

| File | Change |
|-|-|
| `pnpm-workspace.yaml` | No change needed — `packages/*` glob already covers new packages |
| `Agents/protocols/qa-gateway.md` | Update OpenClaw CLI paths from `~/Desktop/OpenClaw/` to `~/Desktop/Alamo-Crafting-Forge/packages/openclaw/` |
| `Agents/skills/governance-gate/SKILL.md` | Update `await-decision` and Hub API paths |

---

## Chunk 1: Protocol Package + OpenClaw Scaffolding

### Task 1: packages/protocol-qa — Event Types

**Files:**
- Create: `packages/protocol-qa/package.json`
- Create: `packages/protocol-qa/tsconfig.json`
- Create: `packages/protocol-qa/src/events.ts`
- Create: `packages/protocol-qa/src/types.ts`
- Create: `packages/protocol-qa/src/index.ts`
- Create: `packages/protocol-qa/test/events.test.ts`

- [ ] **Step 1: Write the failing test for event types**

```typescript
// packages/protocol-qa/test/events.test.ts
import { describe, it, expect } from "vitest";
import {
  QA_EVENT_TYPES,
  isQaEvent,
  type QaEventType,
} from "../src/events.js";

describe("QA Event Types", () => {
  it("defines all gateway event types", () => {
    expect(QA_EVENT_TYPES).toContain("approval.requested");
    expect(QA_EVENT_TYPES).toContain("approval.decided");
    expect(QA_EVENT_TYPES).toContain("session.started");
    expect(QA_EVENT_TYPES).toContain("session.ended");
    expect(QA_EVENT_TYPES).toContain("session.heartbeat");
    expect(QA_EVENT_TYPES).toContain("system.startup");
    expect(QA_EVENT_TYPES).toContain("system.shutdown");
  });

  it("type guard accepts valid event types", () => {
    expect(isQaEvent("approval.requested")).toBe(true);
    expect(isQaEvent("approval.decided")).toBe(true);
    expect(isQaEvent("session.started")).toBe(true);
  });

  it("type guard rejects invalid event types", () => {
    expect(isQaEvent("invalid.event")).toBe(false);
    expect(isQaEvent("")).toBe(false);
    expect(isQaEvent(42)).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd C:/Users/Jay/OneDrive/Desktop/Alamo-Crafting-Forge && npx vitest run packages/protocol-qa/test/events.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Create package scaffolding + implement events**

```json
// packages/protocol-qa/package.json
{
  "name": "@openclaw/protocol-qa",
  "version": "0.1.0",
  "type": "module",
  "exports": {
    ".": {
      "import": "./src/index.ts",
      "types": "./src/index.ts"
    }
  },
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "test": "vitest run"
  },
  "devDependencies": {
    "typescript": "^5.8.2",
    "vitest": "^2.1.8"
  }
}
```

```json
// packages/protocol-qa/tsconfig.json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src/**/*.ts"],
  "exclude": ["test/**/*.ts", "dist"]
}
```

```typescript
// packages/protocol-qa/src/events.ts

export const QA_EVENT_TYPES = [
  "session.started",
  "session.heartbeat",
  "session.ended",
  "session.status",
  "session.output",
  "approval.requested",
  "approval.decided",
  "policy.decision",
  "command.received",
  "message.received",
  "message.sent",
  "message.queued",
  "halt.requested",
  "halt.executed",
  "system.startup",
  "system.shutdown",
] as const;

export type QaEventType = (typeof QA_EVENT_TYPES)[number];

export function isQaEvent(value: unknown): value is QaEventType {
  return typeof value === "string" && QA_EVENT_TYPES.includes(value as QaEventType);
}

export interface QaEvent {
  seq: number;
  timestamp: string;
  type: QaEventType;
  source: string;
  project: string | null;
  payload: string;
  checksum: string;
  schema_version: number;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd C:/Users/Jay/OneDrive/Desktop/Alamo-Crafting-Forge && npx vitest run packages/protocol-qa/test/events.test.ts`
Expected: PASS

- [ ] **Step 5: Write the failing test for types**

```typescript
// packages/protocol-qa/test/types.test.ts
import { describe, it, expect } from "vitest";
import {
  type ProposalPack,
  type ApprovalDecision,
  type SessionState,
  APPROVAL_DECISIONS,
  SESSION_STATUSES,
} from "../src/types.js";

describe("ProposalPack", () => {
  it("creates a valid proposal shape", () => {
    const proposal: ProposalPack = {
      id: "proposal:abc12345",
      project: "Anvil",
      title: "Governance Gate: Deploy v2",
      intent: "Deploy latest changes",
      diff: null,
      impact: "API routes, 3 files",
      requested_by: "governance-gate",
      status: "pending",
      ceo_response: null,
      created_at: "2026-03-15T00:00:00.000Z",
      decided_at: null,
    };
    expect(proposal.status).toBe("pending");
    expect(proposal.decided_at).toBeNull();
  });
});

describe("ApprovalDecision", () => {
  it("defines valid decisions", () => {
    expect(APPROVAL_DECISIONS).toContain("approved");
    expect(APPROVAL_DECISIONS).toContain("rejected");
    expect(APPROVAL_DECISIONS).toContain("commented");
  });
});

describe("SessionState", () => {
  it("defines valid session statuses", () => {
    expect(SESSION_STATUSES).toContain("active");
    expect(SESSION_STATUSES).toContain("idle");
    expect(SESSION_STATUSES).toContain("halted");
    expect(SESSION_STATUSES).toContain("dead");
  });
});
```

- [ ] **Step 6: Implement types**

```typescript
// packages/protocol-qa/src/types.ts

export const APPROVAL_DECISIONS = ["approved", "rejected", "commented"] as const;
export type ApprovalDecision = (typeof APPROVAL_DECISIONS)[number];

export const SESSION_STATUSES = ["active", "idle", "halted", "dead"] as const;
export type SessionStatus = (typeof SESSION_STATUSES)[number];

export interface ProposalPack {
  id: string;
  project: string;
  title: string;
  intent: string;
  diff: string | null;
  impact: string;
  requested_by: string;
  status: "pending" | ApprovalDecision;
  ceo_response: string | null;
  created_at: string;
  decided_at: string | null;
}

export interface SessionState {
  id: string;
  pid: number;
  project: string;
  cwd: string;
  started_at: string;
  last_heartbeat: string;
  status: SessionStatus;
  last_activity: string;
}

export interface PolicyDecision {
  action: string;
  actor: string;
  project: string | null;
  allowed: boolean;
  reason: string;
  tier: "auto" | "openclaw" | "ceo_only";
  timestamp: string;
}

export interface ApprovalMessage {
  type: "approval";
  approval_id: string;
  decision: ApprovalDecision;
  project: string;
  reason?: string;
  timestamp: string;
  message_id: number;
}
```

```typescript
// packages/protocol-qa/src/index.ts
export {
  QA_EVENT_TYPES,
  isQaEvent,
  type QaEventType,
  type QaEvent,
} from "./events.js";

export {
  APPROVAL_DECISIONS,
  SESSION_STATUSES,
  type ApprovalDecision,
  type SessionStatus,
  type ProposalPack,
  type SessionState,
  type PolicyDecision,
  type ApprovalMessage,
} from "./types.js";
```

- [ ] **Step 7: Run all protocol-qa tests**

Run: `cd C:/Users/Jay/OneDrive/Desktop/Alamo-Crafting-Forge && npx vitest run packages/protocol-qa/`
Expected: PASS (all tests)

- [ ] **Step 8: Install deps and verify build**

Run: `cd C:/Users/Jay/OneDrive/Desktop/Alamo-Crafting-Forge && pnpm install && cd packages/protocol-qa && pnpm build`
Expected: Clean compilation

- [ ] **Step 9: Commit**

```bash
git add packages/protocol-qa/
git commit -m "feat(protocol-qa): add QA gateway event schema package

Defines versioned event types (QaEventType), ProposalPack,
ApprovalDecision, SessionState, and PolicyDecision types.
Zero runtime dependencies — pure type/const exports."
```

---

### Task 2: packages/openclaw — Package Scaffolding + Config + Types

**Files:**
- Create: `packages/openclaw/package.json`
- Create: `packages/openclaw/tsconfig.json`
- Create: `packages/openclaw/vitest.config.ts`
- Create: `packages/openclaw/src/types.ts`
- Create: `packages/openclaw/src/config.ts`
- Create: `packages/openclaw/src/index.ts`
- Create: `packages/openclaw/config/telegram-config.example.json`
- Create: `packages/openclaw/.gitignore`
- Create: `packages/openclaw/test/config.test.ts`

- [ ] **Step 1: Write the failing test for config loader**

```typescript
// packages/openclaw/test/config.test.ts
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { readFileSync, writeFileSync, mkdirSync, rmSync } from "fs";
import { resolve } from "path";
import { tmpdir } from "os";
import { randomBytes } from "crypto";

describe("Config", () => {
  let configDir: string;
  let configPath: string;

  beforeEach(() => {
    configDir = resolve(tmpdir(), `openclaw-test-${randomBytes(4).toString("hex")}`);
    mkdirSync(configDir, { recursive: true });
    configPath = resolve(configDir, "telegram-config.json");
    // Reset cached config between tests
    vi.resetModules();
  });

  afterEach(() => {
    rmSync(configDir, { recursive: true, force: true });
  });

  it("loads config from JSON file", async () => {
    writeFileSync(configPath, JSON.stringify({
      bot_token: "123:ABC",
      chat_id: "-100999",
      topics: { Anvil: 42, chat: 1 },
    }));

    const { loadConfig } = await import("../src/config.js");
    const config = loadConfig(configPath);
    expect(config.bot_token).toBe("123:ABC");
    expect(config.chat_id).toBe("-100999");
    expect(config.topics.Anvil).toBe(42);
  });

  it("env vars override file values", async () => {
    writeFileSync(configPath, JSON.stringify({
      bot_token: "file-token",
      chat_id: "-100999",
      topics: {},
    }));

    process.env.TELEGRAM_BOT_TOKEN = "env-token";
    const { loadConfig } = await import("../src/config.js");
    const config = loadConfig(configPath);
    expect(config.bot_token).toBe("env-token");
    delete process.env.TELEGRAM_BOT_TOKEN;
  });

  it("returns defaults when config file missing", async () => {
    const { loadConfig } = await import("../src/config.js");
    const config = loadConfig(resolve(configDir, "nonexistent.json"));
    expect(config.bot_token).toBe("");
    expect(config.hub_port).toBe(7700);
    expect(config.topics).toEqual({});
  });

  it("getChannelTopicId resolves named channels", async () => {
    writeFileSync(configPath, JSON.stringify({
      bot_token: "t",
      chat_id: "c",
      topics: { Anvil: 42, chat: 1 },
    }));

    const { loadConfig, getChannelTopicId } = await import("../src/config.js");
    loadConfig(configPath);
    expect(getChannelTopicId("Anvil")).toBe(42);
    expect(getChannelTopicId("unknown")).toBe(1); // falls back to chat
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd C:/Users/Jay/OneDrive/Desktop/Alamo-Crafting-Forge && npx vitest run packages/openclaw/test/config.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Create package scaffolding**

```json
// packages/openclaw/package.json
{
  "name": "@openclaw/openclaw",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "exports": {
    ".": {
      "import": "./src/index.ts",
      "types": "./src/index.ts"
    }
  },
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "test": "vitest run",
    "hub": "tsx src/cli/hub.ts",
    "notify": "tsx src/cli/notify.ts",
    "await-decision": "tsx src/cli/await-decision.ts"
  },
  "dependencies": {
    "@openclaw/protocol-qa": "workspace:*",
    "better-sqlite3": "^11.8.1"
  },
  "devDependencies": {
    "@types/better-sqlite3": "^7.6.12",
    "@types/node": "^22.13.10",
    "tsx": "^4.21.0",
    "typescript": "^5.8.2",
    "vitest": "^2.1.8"
  }
}
```

```json
// packages/openclaw/tsconfig.json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src/**/*.ts"],
  "exclude": ["test/**/*.ts", "dist"]
}
```

```typescript
// packages/openclaw/vitest.config.ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["test/**/*.test.ts"],
  },
});
```

```
// packages/openclaw/.gitignore
config/telegram-config.json
data/
dist/
```

```json
// packages/openclaw/config/telegram-config.example.json
{
  "bot_token": "YOUR_BOT_TOKEN",
  "chat_id": "YOUR_CHAT_ID",
  "ceo_user_id": "YOUR_USER_ID",
  "hub_port": 7700,
  "topics": {
    "briefings": 0,
    "chat": 0,
    "actions": 0,
    "Anvil": 0,
    "Launch Control": 0
  }
}
```

- [ ] **Step 4: Implement types**

```typescript
// packages/openclaw/src/types.ts

export interface TelegramConfig {
  bot_token: string;
  chat_id: string;
  ceo_user_id: string;
  hub_port: number;
  topics: Record<string, number>;
}

export type MessageType =
  | "text"
  | "voice"
  | "approval_request"
  | "approval_response"
  | "command"
  | "status"
  | "editMessage"
  | "keyboard_message"
  | "direct_message"
  | "callback";

export type MessageChannel = "briefings" | "chat" | "actions";

export const CHANNELS: Record<MessageChannel, string> = {
  briefings: "Briefings",
  chat: "Chat",
  actions: "Action Items",
};

// Project registry — folder name → display name
export const PROJECT_MAP: Record<string, string> = {
  "ECW-Integrations": "ECW Integrations",
  "OpenMill": "Open Mill",
  "ACFDice": "ACF Dice",
  "CCFantasyAPP": "CC Fantasy",
  "MTGApp-Expo": "MTG Mobile",
  "MTGApp": "MTG App",
  "HD2DVTT": "Diorama",
  "Forgepoint": "Forgepoint",
  "Realmforge": "Realmforge",
  "Alamo-Crafting-Forge": "Alamo Crafting Forge",
  "Anvil": "Anvil",
  "MailBridge": "MailBridge",
  "ACFDesigns": "ACF Designs",
  "LaunchControl": "Launch Control",
  "retell-mcp": "Retell MCP",
  "retell-gateway": "Retell Gateway",
  "OpenSCAD-MCP": "DesignForge",
  "Agents": "Boardroom",
};

export function resolveProjectFolder(cwd: string): string | null {
  const sorted = Object.keys(PROJECT_MAP).sort((a, b) => b.length - a.length);
  for (const folder of sorted) {
    if (cwd.includes(folder)) return folder;
  }
  return null;
}

export function resolveProjectName(cwd: string): string {
  const folder = resolveProjectFolder(cwd);
  return folder ? PROJECT_MAP[folder] : "Unknown";
}
```

- [ ] **Step 5: Implement config loader**

```typescript
// packages/openclaw/src/config.ts
import { readFileSync, writeFileSync } from "fs";
import type { TelegramConfig } from "./types.js";

let _config: TelegramConfig | null = null;
let _configPath: string | null = null;

export function loadConfig(configPath?: string): TelegramConfig {
  if (_config) return _config;

  _configPath = configPath ?? null;
  let fileConfig: Record<string, unknown> = {};

  if (_configPath) {
    try {
      fileConfig = JSON.parse(readFileSync(_configPath, "utf-8"));
    } catch {
      // Config file missing — rely on env vars / defaults
    }
  }

  _config = {
    bot_token: (process.env.TELEGRAM_BOT_TOKEN || fileConfig.bot_token || "") as string,
    chat_id: (fileConfig.chat_id || "") as string,
    ceo_user_id: (process.env.CEO_USER_ID || fileConfig.ceo_user_id || "") as string,
    hub_port: parseInt(process.env.HUB_PORT || String(fileConfig.hub_port || 7700), 10),
    topics: (fileConfig.topics || {}) as Record<string, number>,
  };

  return _config;
}

export function resetConfig(): void {
  _config = null;
  _configPath = null;
}

export function getChannelTopicId(channel: string): number {
  const config = _config ?? loadConfig();
  return config.topics[channel] || config.topics["chat"] || 0;
}

export function saveTopicMapping(folder: string, topicId: number): void {
  const config = _config ?? loadConfig();
  config.topics[folder] = topicId;

  if (!_configPath) return;

  let raw: Record<string, unknown>;
  try {
    raw = JSON.parse(readFileSync(_configPath, "utf-8"));
  } catch {
    console.error("Failed to read config file for topic save — skipping write");
    return;
  }

  raw.topics = config.topics;
  writeFileSync(_configPath, JSON.stringify(raw, null, 4), "utf-8");
}

export function getHubUrl(): string {
  const config = _config ?? loadConfig();
  return process.env.HUB_URL || `http://127.0.0.1:${config.hub_port}`;
}
```

```typescript
// packages/openclaw/src/index.ts
export { loadConfig, resetConfig, getChannelTopicId, saveTopicMapping, getHubUrl } from "./config.js";
export {
  type TelegramConfig,
  type MessageType,
  type MessageChannel,
  CHANNELS,
  PROJECT_MAP,
  resolveProjectFolder,
  resolveProjectName,
} from "./types.js";
```

- [ ] **Step 6: Run test to verify it passes**

Run: `cd C:/Users/Jay/OneDrive/Desktop/Alamo-Crafting-Forge && pnpm install && npx vitest run packages/openclaw/test/config.test.ts`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add packages/openclaw/
git commit -m "feat(openclaw): scaffold package with config loader and types

TelegramConfig, project registry, channel routing. Config loads
from JSON file with env var overrides. Zero coupling to ServiceBot."
```

---

## Chunk 2: Telegram Notification Layer

### Task 3: Logger — Markdown Table Logging

**Files:**
- Create: `packages/openclaw/src/logger.ts`
- Create: `packages/openclaw/test/logger.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// packages/openclaw/test/logger.test.ts
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { readFileSync, mkdirSync, rmSync, existsSync } from "fs";
import { resolve } from "path";
import { tmpdir } from "os";
import { randomBytes } from "crypto";
import { createLogger } from "../src/logger.js";

describe("Logger", () => {
  let logDir: string;
  let logFile: string;

  beforeEach(() => {
    logDir = resolve(tmpdir(), `openclaw-log-${randomBytes(4).toString("hex")}`);
    mkdirSync(logDir, { recursive: true });
    logFile = resolve(logDir, "telegram-log.md");
  });

  afterEach(() => {
    rmSync(logDir, { recursive: true, force: true });
  });

  it("creates log file with header on first write", () => {
    const log = createLogger(logFile);
    log("chat", "text", "delivered");
    expect(existsSync(logFile)).toBe(true);
    const content = readFileSync(logFile, "utf-8");
    expect(content).toContain("| Timestamp | Thread | Type | Status | Details |");
  });

  it("appends log entries with pipe-separated fields", () => {
    const log = createLogger(logFile);
    log("Anvil", "approval_request", "delivered", "qa-123");
    const content = readFileSync(logFile, "utf-8");
    expect(content).toContain("| Anvil |");
    expect(content).toContain("| approval_request |");
    expect(content).toContain("| delivered |");
    expect(content).toContain("| qa-123 |");
  });

  it("appends multiple entries", () => {
    const log = createLogger(logFile);
    log("chat", "text", "delivered");
    log("actions", "approval_request", "failed", "timeout");
    const lines = readFileSync(logFile, "utf-8").split("\n").filter(l => l.startsWith("|"));
    // Header + separator + 2 entries = 4 pipe lines
    expect(lines.length).toBe(4);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd C:/Users/Jay/OneDrive/Desktop/Alamo-Crafting-Forge && npx vitest run packages/openclaw/test/logger.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement logger**

```typescript
// packages/openclaw/src/logger.ts
import { appendFileSync, existsSync, mkdirSync } from "fs";
import { dirname } from "path";

const HEADER = `| Timestamp | Thread | Type | Status | Details |
|-----------|--------|------|--------|---------|
`;

export type LogFn = (thread: string, type: string, status: string, details?: string) => void;

export function createLogger(logFile: string): LogFn {
  let initialized = false;

  return function log(thread: string, type: string, status: string, details?: string): void {
    if (!initialized) {
      const dir = dirname(logFile);
      if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
      if (!existsSync(logFile)) {
        appendFileSync(logFile, HEADER);
      }
      initialized = true;
    }

    const ts = new Date().toISOString().slice(0, 16).replace("T", " ");
    const line = `| ${ts} | ${thread} | ${type} | ${status} | ${details || ""} |\n`;
    appendFileSync(logFile, line);
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd C:/Users/Jay/OneDrive/Desktop/Alamo-Crafting-Forge && npx vitest run packages/openclaw/test/logger.test.ts`
Expected: PASS

- [ ] **Step 5: Export from index and commit**

Add to `packages/openclaw/src/index.ts`:
```typescript
export { createLogger, type LogFn } from "./logger.js";
```

```bash
git add packages/openclaw/src/logger.ts packages/openclaw/test/logger.test.ts packages/openclaw/src/index.ts
git commit -m "feat(openclaw): add markdown table logger"
```

---

### Task 4: Notify — sendText + sendApproval

**Files:**
- Create: `packages/openclaw/src/notify.ts`
- Create: `packages/openclaw/test/notify.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// packages/openclaw/test/notify.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mkdirSync, rmSync, writeFileSync } from "fs";
import { resolve } from "path";
import { tmpdir } from "os";
import { randomBytes } from "crypto";

describe("Notify", () => {
  let configDir: string;
  let configPath: string;
  let logFile: string;
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    configDir = resolve(tmpdir(), `openclaw-notify-${randomBytes(4).toString("hex")}`);
    mkdirSync(configDir, { recursive: true });
    configPath = resolve(configDir, "config.json");
    logFile = resolve(configDir, "log.md");

    writeFileSync(configPath, JSON.stringify({
      bot_token: "test-token",
      chat_id: "-100999",
      topics: { Anvil: 42, chat: 1 },
    }));

    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    rmSync(configDir, { recursive: true, force: true });
  });

  it("sendText sends message to correct topic", async () => {
    fetchMock.mockResolvedValueOnce({
      json: () => Promise.resolve({ ok: true, result: { message_id: 123 } }),
      status: 200,
    });

    const { createNotifier } = await import("../src/notify.js");
    const { sendText } = createNotifier(configPath, logFile);
    const result = await sendText("Anvil", "Build complete");

    expect(result).toBe(123);
    expect(fetchMock).toHaveBeenCalledOnce();
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.chat_id).toBe("-100999");
    expect(body.message_thread_id).toBe(42);
    expect(body.text).toBe("Build complete");
  });

  it("sendApproval includes inline keyboard", async () => {
    fetchMock.mockResolvedValueOnce({
      json: () => Promise.resolve({ ok: true }),
      status: 200,
    });

    const { createNotifier } = await import("../src/notify.js");
    const { sendApproval } = createNotifier(configPath, logFile);
    const result = await sendApproval("Anvil", "Ready for review", "qa-123");

    expect(result).toBe(true);
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.reply_markup.inline_keyboard[0]).toHaveLength(3);
    expect(body.reply_markup.inline_keyboard[0][0].callback_data).toBe("approve:qa-123");
    expect(body.reply_markup.inline_keyboard[0][1].callback_data).toBe("reject:qa-123");
    expect(body.reply_markup.inline_keyboard[0][2].callback_data).toBe("comment:qa-123");
  });

  it("sendText falls back to plain text on Markdown parse error", async () => {
    fetchMock
      .mockResolvedValueOnce({
        json: () => Promise.resolve({ ok: false, description: "Bad Request: can't parse" }),
        status: 400,
      })
      .mockResolvedValueOnce({
        json: () => Promise.resolve({ ok: true, result: { message_id: 456 } }),
        status: 200,
      });

    const { createNotifier } = await import("../src/notify.js");
    const { sendText } = createNotifier(configPath, logFile);
    const result = await sendText("chat", "test *broken markdown");

    expect(result).toBe(456);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    // Second call should NOT have parse_mode
    const secondBody = JSON.parse(fetchMock.mock.calls[1][1].body);
    expect(secondBody.parse_mode).toBeUndefined();
  });

  it("sendText returns null on failure", async () => {
    fetchMock.mockRejectedValue(new Error("Network error"));

    const { createNotifier } = await import("../src/notify.js");
    const { sendText } = createNotifier(configPath, logFile);
    const result = await sendText("chat", "test");

    expect(result).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd C:/Users/Jay/OneDrive/Desktop/Alamo-Crafting-Forge && npx vitest run packages/openclaw/test/notify.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement notify**

```typescript
// packages/openclaw/src/notify.ts
import { loadConfig, getChannelTopicId, resetConfig } from "./config.js";
import { createLogger, type LogFn } from "./logger.js";

interface Notifier {
  sendText(channel: string | number, message: string): Promise<number | null>;
  sendApproval(channel: string | number, message: string, approvalId: string): Promise<boolean>;
}

export function createNotifier(configPath?: string, logFile?: string): Notifier {
  resetConfig();
  const config = loadConfig(configPath);
  const log: LogFn = logFile
    ? createLogger(logFile)
    : (_t, _ty, _s, _d) => {}; // no-op if no log file

  async function sendText(channel: string | number, message: string): Promise<number | null> {
    const topicId = typeof channel === "number" ? channel : getChannelTopicId(channel);
    const label = typeof channel === "string" ? channel : `topic-${channel}`;

    const basePayload: Record<string, unknown> = {
      chat_id: config.chat_id,
      text: message,
      disable_notification: true,
    };
    if (topicId) basePayload.message_thread_id = topicId;

    const url = `https://api.telegram.org/bot${config.bot_token}/sendMessage`;

    for (const parseMode of ["Markdown", undefined] as const) {
      const payload = { ...basePayload, ...(parseMode ? { parse_mode: parseMode } : {}) };
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          const resp = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json; charset=utf-8" },
            body: JSON.stringify(payload),
            signal: AbortSignal.timeout(15000),
          });

          const data = (await resp.json()) as {
            ok: boolean;
            description?: string;
            result?: { message_id: number };
          };

          if (data.ok) {
            log(label, "text", "delivered");
            return data.result?.message_id ?? 0;
          }

          if (parseMode && data.description?.includes("parse")) break;

          if (resp.status >= 500 && attempt === 0) {
            await new Promise((r) => setTimeout(r, 1000));
            continue;
          }

          log(label, "text", "failed", data.description);
          return null;
        } catch (err) {
          if (attempt === 0) {
            await new Promise((r) => setTimeout(r, 1000));
            continue;
          }
          log(label, "text", "failed", String(err));
          return null;
        }
      }
    }

    return null;
  }

  async function sendApproval(
    channel: string | number,
    message: string,
    approvalId: string
  ): Promise<boolean> {
    const topicId = typeof channel === "number" ? channel : getChannelTopicId(channel);
    const label = typeof channel === "string" ? channel : `topic-${channel}`;

    const replyMarkup = {
      inline_keyboard: [
        [
          { text: "Approve", callback_data: `approve:${approvalId}` },
          { text: "Reject", callback_data: `reject:${approvalId}` },
          { text: "Comment", callback_data: `comment:${approvalId}` },
        ],
      ],
    };

    const basePayload: Record<string, unknown> = {
      chat_id: config.chat_id,
      text: message,
      disable_notification: false,
      reply_markup: replyMarkup,
    };
    if (topicId) basePayload.message_thread_id = topicId;

    const url = `https://api.telegram.org/bot${config.bot_token}/sendMessage`;

    for (const parseMode of ["Markdown", undefined] as const) {
      const payload = { ...basePayload, ...(parseMode ? { parse_mode: parseMode } : {}) };
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          const resp = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json; charset=utf-8" },
            body: JSON.stringify(payload),
            signal: AbortSignal.timeout(15000),
          });

          const data = (await resp.json()) as { ok: boolean; description?: string };

          if (data.ok) {
            log(label, "approval_request", "delivered");
            return true;
          }

          if (parseMode && data.description?.includes("parse")) break;

          if (resp.status >= 500 && attempt === 0) {
            await new Promise((r) => setTimeout(r, 1000));
            continue;
          }

          log(label, "approval_request", "failed", data.description);
          return false;
        } catch (err) {
          if (attempt === 0) {
            await new Promise((r) => setTimeout(r, 1000));
            continue;
          }
          log(label, "approval_request", "failed", String(err));
          return false;
        }
      }
    }

    return false;
  }

  return { sendText, sendApproval };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd C:/Users/Jay/OneDrive/Desktop/Alamo-Crafting-Forge && npx vitest run packages/openclaw/test/notify.test.ts`
Expected: PASS

- [ ] **Step 5: Export and commit**

Add to `packages/openclaw/src/index.ts`:
```typescript
export { createNotifier } from "./notify.js";
```

```bash
git add packages/openclaw/src/notify.ts packages/openclaw/test/notify.test.ts packages/openclaw/src/index.ts
git commit -m "feat(openclaw): add Telegram notification sender

sendText with Markdown fallback + retry, sendApproval with
inline keyboard (Approve/Reject/Comment). Factory pattern
for testability."
```

---

### Task 5: Notify CLI Entry Point

**Files:**
- Create: `packages/openclaw/src/cli/notify.ts`

- [ ] **Step 1: Implement CLI**

```typescript
// packages/openclaw/src/cli/notify.ts
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { createNotifier } from "../notify.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CONFIG_PATH = resolve(__dirname, "..", "..", "config", "telegram-config.json");
const LOG_FILE = resolve(__dirname, "..", "..", ".boardroom", "telegram-log.md");

const args = process.argv.slice(2);

if (args[0] === "--approval") {
  const target = args[1];
  const approvalId = args[2];
  const message = args.slice(3).join(" ");

  if (!target || !approvalId || !message) {
    console.log("Usage: tsx src/cli/notify.ts --approval <channel> <approval-id> <message>");
    process.exit(1);
  }

  const { sendApproval } = createNotifier(CONFIG_PATH, LOG_FILE);
  sendApproval(target, message, approvalId).then((ok) => {
    if (!ok) process.exit(1);
  });
} else {
  const target = args[0];
  const message = args.slice(1).join(" ");

  if (!target || !message) {
    console.log("Usage: tsx src/cli/notify.ts <channel> <message>");
    console.log("Channels: briefings, chat, actions, or project name");
    console.log("\nApproval mode:");
    console.log("  tsx src/cli/notify.ts --approval <channel> <approval-id> <message>");
    process.exit(1);
  }

  const { sendText } = createNotifier(CONFIG_PATH, LOG_FILE);
  sendText(target, message).then((id) => {
    if (id === null) process.exit(1);
  });
}
```

- [ ] **Step 2: Commit**

```bash
git add packages/openclaw/src/cli/notify.ts
git commit -m "feat(openclaw): add notify CLI entry point

Usage: npm run notify -- <channel> <message>
       npm run notify -- --approval <channel> <id> <message>"
```

---

## Chunk 3: Hub Database + Event Log

### Task 6: OpenClaw Database — SQLite Setup

**Files:**
- Create: `packages/openclaw/src/db/database.ts`
- Create: `packages/openclaw/src/db/migrations/001_init.sql`
- Create: `packages/openclaw/test/db/database.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// packages/openclaw/test/db/database.test.ts
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdirSync, rmSync } from "fs";
import { resolve } from "path";
import { tmpdir } from "os";
import { randomBytes } from "crypto";
import { OpenClawDatabase } from "../../src/db/database.js";

describe("OpenClawDatabase", () => {
  let dataDir: string;
  let db: OpenClawDatabase;

  beforeEach(() => {
    dataDir = resolve(tmpdir(), `openclaw-db-${randomBytes(4).toString("hex")}`);
    mkdirSync(dataDir, { recursive: true });
    db = new OpenClawDatabase(resolve(dataDir, "hub.sqlite"));
  });

  afterEach(() => {
    db.close();
    rmSync(dataDir, { recursive: true, force: true });
  });

  it("creates database with WAL mode", () => {
    const mode = db.raw.pragma("journal_mode", { simple: true });
    expect(mode).toBe("wal");
  });

  it("runs migrations and creates tables", () => {
    const tables = db.raw
      .prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
      .all() as { name: string }[];
    const names = tables.map((t) => t.name);
    expect(names).toContain("events");
    expect(names).toContain("sessions");
    expect(names).toContain("approvals");
    expect(names).toContain("policy_decisions");
    expect(names).toContain("actions");
    expect(names).toContain("schema_version");
  });

  it("reports current schema version", () => {
    expect(db.schemaVersion()).toBeGreaterThanOrEqual(1);
  });

  it("is idempotent — reopening runs no duplicate migrations", () => {
    db.close();
    const db2 = new OpenClawDatabase(resolve(dataDir, "hub.sqlite"));
    expect(db2.schemaVersion()).toBeGreaterThanOrEqual(1);
    db2.close();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd C:/Users/Jay/OneDrive/Desktop/Alamo-Crafting-Forge && npx vitest run packages/openclaw/test/db/database.test.ts`
Expected: FAIL

- [ ] **Step 3: Create migration SQL**

```sql
-- packages/openclaw/src/db/migrations/001_init.sql
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
```

- [ ] **Step 4: Implement database class**

```typescript
// packages/openclaw/src/db/database.ts
import Database from "better-sqlite3";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = resolve(__dirname, "migrations");

export class OpenClawDatabase {
  readonly raw: Database.Database;

  constructor(dbPath: string) {
    this.raw = new Database(dbPath);
    this.raw.pragma("journal_mode = WAL");
    this.raw.pragma("synchronous = NORMAL");
    this.raw.pragma("foreign_keys = ON");
    this.migrate();
  }

  private migrate(): void {
    this.raw.exec(`
      CREATE TABLE IF NOT EXISTS schema_version (
        version INTEGER PRIMARY KEY
      );
    `);

    const current = this.raw
      .prepare("SELECT MAX(version) as v FROM schema_version")
      .get() as { v: number | null };
    const version = current?.v ?? 0;

    if (version < 1) {
      const sql = readFileSync(resolve(MIGRATIONS_DIR, "001_init.sql"), "utf-8");
      this.raw.exec(sql);
      this.raw.prepare("INSERT INTO schema_version (version) VALUES (?)").run(1);
    }
  }

  schemaVersion(): number {
    const row = this.raw
      .prepare("SELECT MAX(version) as v FROM schema_version")
      .get() as { v: number | null };
    return row?.v ?? 0;
  }

  close(): void {
    this.raw.close();
  }
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd C:/Users/Jay/OneDrive/Desktop/Alamo-Crafting-Forge && npx vitest run packages/openclaw/test/db/database.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add packages/openclaw/src/db/ packages/openclaw/test/db/
git commit -m "feat(openclaw): add SQLite database with Hub schema

WAL mode, events/sessions/approvals/policy_decisions/actions
tables. Migration runner with versioning."
```

---

### Task 7: Event Log Module

**Files:**
- Create: `packages/openclaw/src/hub/event-log.ts`
- Create: `packages/openclaw/test/hub/event-log.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// packages/openclaw/test/hub/event-log.test.ts
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdirSync, rmSync } from "fs";
import { resolve } from "path";
import { tmpdir } from "os";
import { randomBytes } from "crypto";
import { OpenClawDatabase } from "../../src/db/database.js";
import { createEventLog } from "../../src/hub/event-log.js";

describe("Event Log", () => {
  let dataDir: string;
  let db: OpenClawDatabase;
  let eventLog: ReturnType<typeof createEventLog>;

  beforeEach(() => {
    dataDir = resolve(tmpdir(), `openclaw-events-${randomBytes(4).toString("hex")}`);
    mkdirSync(dataDir, { recursive: true });
    db = new OpenClawDatabase(resolve(dataDir, "hub.sqlite"));
    eventLog = createEventLog(db);
  });

  afterEach(() => {
    db.close();
    rmSync(dataDir, { recursive: true, force: true });
  });

  it("appends an event and returns it with seq", () => {
    const event = eventLog.append("system.startup", "hub", null, { port: 7700 });
    expect(event.seq).toBeGreaterThan(0);
    expect(event.type).toBe("system.startup");
    expect(event.source).toBe("hub");
    expect(event.checksum).toBeTruthy();
  });

  it("retrieves events by type", () => {
    eventLog.append("system.startup", "hub", null, {});
    eventLog.append("approval.requested", "gate", "Anvil", { title: "test" });
    eventLog.append("system.shutdown", "hub", null, {});

    const approvals = eventLog.getEvents({ type: "approval.requested" });
    expect(approvals).toHaveLength(1);
    expect(approvals[0].project).toBe("Anvil");
  });

  it("retrieves events by project", () => {
    eventLog.append("approval.requested", "gate", "Anvil", {});
    eventLog.append("approval.requested", "gate", "Launch Control", {});

    const events = eventLog.getEvents({ project: "Anvil" });
    expect(events).toHaveLength(1);
  });

  it("limits results", () => {
    for (let i = 0; i < 10; i++) {
      eventLog.append("session.heartbeat", "s1", null, {});
    }
    const events = eventLog.getEvents({ limit: 3 });
    expect(events).toHaveLength(3);
  });

  it("computes checksum for integrity", () => {
    const e1 = eventLog.append("system.startup", "hub", null, {});
    const e2 = eventLog.append("system.shutdown", "hub", null, {});
    expect(e1.checksum).not.toBe(e2.checksum);
  });

  it("rejects invalid event types", () => {
    expect(() => eventLog.append("invalid.event" as any, "hub", null, {}))
      .toThrow(/Invalid event type/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd C:/Users/Jay/OneDrive/Desktop/Alamo-Crafting-Forge && npx vitest run packages/openclaw/test/hub/event-log.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement event log**

```typescript
// packages/openclaw/src/hub/event-log.ts
import { createHash } from "crypto";
import type { OpenClawDatabase } from "../db/database.js";
import { isQaEvent, QA_EVENT_TYPES, type QaEventType, type QaEvent } from "@openclaw/protocol-qa";

interface GetEventsOptions {
  type?: string;
  project?: string;
  afterSeq?: number;
  beforeSeq?: number;
  limit?: number;
}

export function createEventLog(db: OpenClawDatabase) {
  const insertStmt = db.raw.prepare(`
    INSERT INTO events (timestamp, type, source, project, payload, checksum, schema_version)
    VALUES (?, ?, ?, ?, ?, ?, 1)
  `);

  function computeChecksum(type: string, source: string, project: string | null, payload: string, timestamp: string): string {
    return createHash("sha256")
      .update(`${type}:${source}:${project ?? ""}:${payload}:${timestamp}`)
      .digest("hex")
      .slice(0, 16);
  }

  function append(
    type: QaEventType | string,
    source: string,
    project: string | null,
    data: Record<string, unknown>
  ): QaEvent {
    // Validate event type against protocol schema
    if (!isQaEvent(type)) {
      throw new Error(`Invalid event type: "${type}". Must be one of: ${QA_EVENT_TYPES.join(", ")}`);
    }
    const timestamp = new Date().toISOString();
    const payload = JSON.stringify(data);
    const checksum = computeChecksum(type, source, project, payload, timestamp);

    const result = insertStmt.run(timestamp, type, source, project, payload, checksum);

    return {
      seq: result.lastInsertRowid as number,
      timestamp,
      type: type as QaEventType,
      source,
      project,
      payload,
      checksum,
      schema_version: 1,
    };
  }

  function getEvents(opts: GetEventsOptions = {}): QaEvent[] {
    const conditions: string[] = [];
    const params: unknown[] = [];

    if (opts.type) {
      conditions.push("type = ?");
      params.push(opts.type);
    }
    if (opts.project) {
      conditions.push("project = ?");
      params.push(opts.project);
    }
    if (opts.afterSeq !== undefined) {
      conditions.push("seq > ?");
      params.push(opts.afterSeq);
    }
    if (opts.beforeSeq !== undefined) {
      conditions.push("seq < ?");
      params.push(opts.beforeSeq);
    }

    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    const limit = opts.limit ?? 50;

    return db.raw
      .prepare(`SELECT * FROM events ${where} ORDER BY seq DESC LIMIT ?`)
      .all(...params, limit) as QaEvent[];
  }

  function getLatestEvent(type: string, project?: string): QaEvent | null {
    if (project) {
      return (db.raw
        .prepare("SELECT * FROM events WHERE type = ? AND project = ? ORDER BY seq DESC LIMIT 1")
        .get(type, project) as QaEvent) ?? null;
    }
    return (db.raw
      .prepare("SELECT * FROM events WHERE type = ? ORDER BY seq DESC LIMIT 1")
      .get(type) as QaEvent) ?? null;
  }

  return { append, getEvents, getLatestEvent };
}

export type EventLog = ReturnType<typeof createEventLog>;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd C:/Users/Jay/OneDrive/Desktop/Alamo-Crafting-Forge && npx vitest run packages/openclaw/test/hub/event-log.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/openclaw/src/hub/event-log.ts packages/openclaw/test/hub/event-log.test.ts
git commit -m "feat(openclaw): add event log with append, query, and checksums"
```

---

### Task 8: Approvals Module

**Files:**
- Create: `packages/openclaw/src/hub/approvals.ts`
- Create: `packages/openclaw/test/hub/approvals.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// packages/openclaw/test/hub/approvals.test.ts
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdirSync, rmSync } from "fs";
import { resolve } from "path";
import { tmpdir } from "os";
import { randomBytes } from "crypto";
import { OpenClawDatabase } from "../../src/db/database.js";
import { createEventLog } from "../../src/hub/event-log.js";
import { createApprovals } from "../../src/hub/approvals.js";

describe("Approvals", () => {
  let dataDir: string;
  let db: OpenClawDatabase;
  let approvals: ReturnType<typeof createApprovals>;

  beforeEach(() => {
    dataDir = resolve(tmpdir(), `openclaw-approvals-${randomBytes(4).toString("hex")}`);
    mkdirSync(dataDir, { recursive: true });
    db = new OpenClawDatabase(resolve(dataDir, "hub.sqlite"));
    const eventLog = createEventLog(db);
    approvals = createApprovals(db, eventLog);
  });

  afterEach(() => {
    db.close();
    rmSync(dataDir, { recursive: true, force: true });
  });

  it("creates a proposal with pending status", () => {
    const p = approvals.create("Anvil", "Deploy v2", "Ship changes", "3 files", "gate");
    expect(p.id).toMatch(/^proposal:/);
    expect(p.status).toBe("pending");
    expect(p.project).toBe("Anvil");
  });

  it("decides a proposal", () => {
    const p = approvals.create("Anvil", "Deploy v2", "Ship", "3 files", "gate");
    const decided = approvals.decide(p.id, "approved", "LGTM");
    expect(decided).not.toBeNull();
    expect(decided!.status).toBe("approved");
    expect(decided!.ceo_response).toBe("LGTM");
    expect(decided!.decided_at).toBeTruthy();
  });

  it("rejects deciding an already-decided proposal", () => {
    const p = approvals.create("Anvil", "Test", "t", "t", "gate");
    approvals.decide(p.id, "approved");
    const retry = approvals.decide(p.id, "rejected");
    expect(retry).toBeNull();
  });

  it("lists pending proposals", () => {
    approvals.create("Anvil", "Task A", "a", "a", "gate");
    approvals.create("Launch Control", "Task B", "b", "b", "gate");
    const p3 = approvals.create("Anvil", "Task C", "c", "c", "gate");
    approvals.decide(p3.id, "approved");

    const pending = approvals.getPending();
    expect(pending).toHaveLength(2);

    const anvilPending = approvals.getPending("Anvil");
    expect(anvilPending).toHaveLength(1);
    expect(anvilPending[0].title).toBe("Task A");
  });

  it("gets a specific proposal by ID", () => {
    const p = approvals.create("Anvil", "Test", "t", "t", "gate");
    const found = approvals.get(p.id);
    expect(found).not.toBeNull();
    expect(found!.title).toBe("Test");
  });

  it("returns null for unknown proposal ID", () => {
    expect(approvals.get("proposal:nonexistent")).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd C:/Users/Jay/OneDrive/Desktop/Alamo-Crafting-Forge && npx vitest run packages/openclaw/test/hub/approvals.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement approvals**

```typescript
// packages/openclaw/src/hub/approvals.ts
import { randomUUID } from "crypto";
import type { OpenClawDatabase } from "../db/database.js";
import type { EventLog } from "./event-log.js";
import type { ProposalPack, ApprovalDecision } from "@openclaw/protocol-qa";

export function createApprovals(db: OpenClawDatabase, eventLog: EventLog) {
  const insertStmt = db.raw.prepare(`
    INSERT INTO approvals (id, project, title, intent, diff, impact, requested_by, status, ceo_response, created_at, decided_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const decideStmt = db.raw.prepare(`
    UPDATE approvals SET status = ?, ceo_response = ?, decided_at = ? WHERE id = ?
  `);

  function create(
    project: string,
    title: string,
    intent: string,
    impact: string,
    requestedBy: string,
    diff?: string
  ): ProposalPack {
    const id = `proposal:${randomUUID().slice(0, 8)}`;
    const now = new Date().toISOString();

    const proposal: ProposalPack = {
      id,
      project,
      title,
      intent,
      diff: diff || null,
      impact,
      requested_by: requestedBy,
      status: "pending",
      ceo_response: null,
      created_at: now,
      decided_at: null,
    };

    insertStmt.run(id, project, title, intent, proposal.diff, impact, requestedBy, "pending", null, now, null);
    eventLog.append("approval.requested", requestedBy, project, { proposal_id: id, title, intent, impact });

    return proposal;
  }

  function decide(proposalId: string, decision: ApprovalDecision, response?: string): ProposalPack | null {
    const existing = db.raw.prepare("SELECT * FROM approvals WHERE id = ?").get(proposalId) as ProposalPack | undefined;
    if (!existing || existing.status !== "pending") return null;

    const now = new Date().toISOString();
    decideStmt.run(decision, response || null, now, proposalId);

    eventLog.append("approval.decided", "ceo", existing.project, {
      proposal_id: proposalId,
      decision,
      response,
    });

    return { ...existing, status: decision, ceo_response: response || null, decided_at: now };
  }

  function getPending(project?: string): ProposalPack[] {
    if (project) {
      return db.raw.prepare("SELECT * FROM approvals WHERE status = 'pending' AND project = ? ORDER BY created_at ASC")
        .all(project) as ProposalPack[];
    }
    return db.raw.prepare("SELECT * FROM approvals WHERE status = 'pending' ORDER BY created_at ASC")
      .all() as ProposalPack[];
  }

  function get(proposalId: string): ProposalPack | null {
    return (db.raw.prepare("SELECT * FROM approvals WHERE id = ?").get(proposalId) as ProposalPack) ?? null;
  }

  function getRecent(limit = 20): ProposalPack[] {
    return db.raw.prepare("SELECT * FROM approvals ORDER BY created_at DESC LIMIT ?")
      .all(limit) as ProposalPack[];
  }

  return { create, decide, getPending, get, getRecent };
}

export type Approvals = ReturnType<typeof createApprovals>;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd C:/Users/Jay/OneDrive/Desktop/Alamo-Crafting-Forge && npx vitest run packages/openclaw/test/hub/approvals.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/openclaw/src/hub/approvals.ts packages/openclaw/test/hub/approvals.test.ts
git commit -m "feat(openclaw): add approval lifecycle (create, decide, query)

ProposalPack CRUD backed by SQLite. Events appended on
create and decide. Rejects re-deciding already-decided proposals."
```

---

## Chunk 4: Sessions + Hub Server

### Task 9: Session Management

**Files:**
- Create: `packages/openclaw/src/hub/sessions.ts`
- Create: `packages/openclaw/test/hub/sessions.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// packages/openclaw/test/hub/sessions.test.ts
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdirSync, rmSync } from "fs";
import { resolve } from "path";
import { tmpdir } from "os";
import { randomBytes } from "crypto";
import { OpenClawDatabase } from "../../src/db/database.js";
import { createEventLog } from "../../src/hub/event-log.js";
import { createSessions } from "../../src/hub/sessions.js";

describe("Sessions", () => {
  let dataDir: string;
  let db: OpenClawDatabase;
  let sessions: ReturnType<typeof createSessions>;

  beforeEach(() => {
    dataDir = resolve(tmpdir(), `openclaw-sessions-${randomBytes(4).toString("hex")}`);
    mkdirSync(dataDir, { recursive: true });
    db = new OpenClawDatabase(resolve(dataDir, "hub.sqlite"));
    const eventLog = createEventLog(db);
    sessions = createSessions(db, eventLog);
  });

  afterEach(() => {
    db.close();
    rmSync(dataDir, { recursive: true, force: true });
  });

  it("registers a new session", () => {
    const s = sessions.register("Anvil", "/path/to/anvil", 1234);
    expect(s.id).toBeTruthy();
    expect(s.project).toBe("Anvil");
    expect(s.status).toBe("active");
  });

  it("sends heartbeat", () => {
    const s = sessions.register("Anvil", "/path", 1234);
    const ok = sessions.heartbeat(s.id, "Running tests");
    expect(ok).toBe(true);
  });

  it("ends a session", () => {
    const s = sessions.register("Anvil", "/path", 1234);
    const ok = sessions.end(s.id);
    expect(ok).toBe(true);

    const active = sessions.getActive();
    expect(active).toHaveLength(0);
  });

  it("lists active sessions", () => {
    sessions.register("Anvil", "/a", 1);
    sessions.register("Launch Control", "/b", 2);
    const s3 = sessions.register("MailBridge", "/c", 3);
    sessions.end(s3.id);

    expect(sessions.getActive()).toHaveLength(2);
  });

  it("reaps dead sessions", () => {
    const s = sessions.register("Anvil", "/a", 1);
    // Manually backdate the heartbeat epoch to 5 minutes ago
    const fiveMinAgo = Math.floor(Date.now() / 1000) - 300;
    db.raw.prepare("UPDATE sessions SET last_heartbeat_epoch = ?").run(fiveMinAgo);
    const reaped = sessions.reapDead(120); // 2-minute timeout
    expect(reaped).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd C:/Users/Jay/OneDrive/Desktop/Alamo-Crafting-Forge && npx vitest run packages/openclaw/test/hub/sessions.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement sessions**

```typescript
// packages/openclaw/src/hub/sessions.ts
import { randomUUID } from "crypto";
import type { OpenClawDatabase } from "../db/database.js";
import type { EventLog } from "./event-log.js";
import type { SessionState } from "@openclaw/protocol-qa";

export function createSessions(db: OpenClawDatabase, eventLog: EventLog) {
  function nowEpoch(): number {
    return Math.floor(Date.now() / 1000);
  }

  function register(project: string, cwd: string, pid: number, id?: string): SessionState {
    const sessionId = id || `session:${randomUUID().slice(0, 8)}`;
    const now = nowEpoch();
    const nowIso = new Date().toISOString();

    const session: SessionState = {
      id: sessionId,
      pid,
      project,
      cwd,
      started_at: nowIso,
      last_heartbeat: nowIso,
      status: "active",
      last_activity: "Starting",
    };

    db.raw.prepare(`
      INSERT INTO sessions (id, pid, project, cwd, started_at, last_heartbeat, last_heartbeat_epoch, status, last_activity)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(sessionId, pid, project, cwd, nowIso, nowIso, now, "active", "Starting");

    eventLog.append("session.started", sessionId, project, { pid, cwd });
    return session;
  }

  function heartbeat(sessionId: string, activity?: string): boolean {
    const now = nowEpoch();
    const nowIso = new Date().toISOString();
    const result = db.raw.prepare(`
      UPDATE sessions SET last_heartbeat = ?, last_heartbeat_epoch = ?, last_activity = COALESCE(?, last_activity)
      WHERE id = ? AND status IN ('active', 'idle')
    `).run(nowIso, now, activity || null, sessionId);
    return result.changes > 0;
  }

  function end(sessionId: string): boolean {
    const result = db.raw.prepare(`
      UPDATE sessions SET status = 'dead' WHERE id = ?
    `).run(sessionId);

    if (result.changes > 0) {
      const session = get(sessionId);
      eventLog.append("session.ended", sessionId, session?.project ?? null, {});
    }
    return result.changes > 0;
  }

  function get(sessionId: string): SessionState | null {
    return (db.raw.prepare("SELECT * FROM sessions WHERE id = ?").get(sessionId) as SessionState) ?? null;
  }

  function getActive(): SessionState[] {
    return db.raw.prepare("SELECT * FROM sessions WHERE status IN ('active', 'idle') ORDER BY started_at DESC")
      .all() as SessionState[];
  }

  function getByProject(project: string): SessionState | null {
    return (db.raw.prepare("SELECT * FROM sessions WHERE project = ? AND status IN ('active', 'idle') ORDER BY started_at DESC LIMIT 1")
      .get(project) as SessionState) ?? null;
  }

  function reapDead(timeoutSeconds: number): number {
    const cutoff = nowEpoch() - timeoutSeconds;
    const result = db.raw.prepare(`
      UPDATE sessions SET status = 'dead'
      WHERE status IN ('active', 'idle')
      AND last_heartbeat_epoch < ?
    `).run(cutoff);
    return result.changes;
  }

  return { register, heartbeat, end, get, getActive, getByProject, reapDead };
}

export type Sessions = ReturnType<typeof createSessions>;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd C:/Users/Jay/OneDrive/Desktop/Alamo-Crafting-Forge && npx vitest run packages/openclaw/test/hub/sessions.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/openclaw/src/hub/sessions.ts packages/openclaw/test/hub/sessions.test.ts
git commit -m "feat(openclaw): add session management (register, heartbeat, reap)"
```

---

### Task 10: Hub HTTP Server

**Files:**
- Create: `packages/openclaw/src/hub/auth.ts`
- Create: `packages/openclaw/src/hub/server.ts`
- Create: `packages/openclaw/test/hub/server.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// packages/openclaw/test/hub/server.test.ts
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdirSync, rmSync } from "fs";
import { resolve } from "path";
import { tmpdir } from "os";
import { randomBytes } from "crypto";
import { createHub, type Hub } from "../../src/hub/server.js";

describe("Hub HTTP Server", () => {
  let dataDir: string;
  let hub: Hub;
  let baseUrl: string;
  const port = 17700 + Math.floor(Math.random() * 1000);

  beforeEach(async () => {
    dataDir = resolve(tmpdir(), `openclaw-hub-${randomBytes(4).toString("hex")}`);
    mkdirSync(dataDir, { recursive: true });
    hub = await createHub({ dbPath: resolve(dataDir, "hub.sqlite"), port });
    baseUrl = `http://127.0.0.1:${port}`;
  });

  afterEach(async () => {
    await hub.stop();
    rmSync(dataDir, { recursive: true, force: true });
  });

  it("GET /api/status returns hub status", async () => {
    const resp = await fetch(`${baseUrl}/api/status`);
    const data = await resp.json();
    expect(data.hub).toBe("running");
    expect(data.active_sessions).toBe(0);
    expect(data.pending_approvals).toBe(0);
  });

  it("POST + GET /api/approvals lifecycle", async () => {
    const token = hub.token;

    // Create proposal
    const createResp = await fetch(`${baseUrl}/api/approvals`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        project: "Anvil",
        title: "Deploy v2",
        intent: "Ship changes",
        impact: "3 files",
        requested_by: "test",
      }),
    });
    expect(createResp.status).toBe(201);
    const { proposal } = await createResp.json();
    expect(proposal.status).toBe("pending");

    // List pending
    const listResp = await fetch(`${baseUrl}/api/approvals`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const { approvals } = await listResp.json();
    expect(approvals).toHaveLength(1);

    // Decide
    const decideResp = await fetch(`${baseUrl}/api/approvals/decide`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ proposal_id: proposal.id, decision: "approved", response: "LGTM" }),
    });
    expect(decideResp.status).toBe(200);
    const decided = await decideResp.json();
    expect(decided.proposal.status).toBe("approved");
  });

  it("GET /api/approvals/:id returns specific proposal", async () => {
    const token = hub.token;
    const createResp = await fetch(`${baseUrl}/api/approvals`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ project: "X", title: "T", intent: "I", impact: "M", requested_by: "t" }),
    });
    const { proposal } = await createResp.json();

    const getResp = await fetch(`${baseUrl}/api/approvals/${proposal.id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(getResp.status).toBe(200);
    const data = await getResp.json();
    expect(data.proposal.id).toBe(proposal.id);
  });

  it("rejects unauthenticated API requests", async () => {
    const resp = await fetch(`${baseUrl}/api/approvals`);
    expect(resp.status).toBe(401);
  });

  it("rejects malformed Authorization header", async () => {
    const resp = await fetch(`${baseUrl}/api/approvals`, {
      headers: { Authorization: "NotBearer token" },
    });
    expect(resp.status).toBe(401);
  });

  it("rejects wrong token", async () => {
    const resp = await fetch(`${baseUrl}/api/approvals`, {
      headers: { Authorization: "Bearer wrong-token-value" },
    });
    expect(resp.status).toBe(401);
  });

  it("rejects invalid event types on POST /api/events", async () => {
    const token = hub.token;
    const resp = await fetch(`${baseUrl}/api/events`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ type: "invalid.event", source: "test" }),
    });
    expect(resp.status).toBe(400);
    const data = await resp.json();
    expect(data.error).toContain("Invalid event type");
  });

  it("POST + GET /api/sessions lifecycle", async () => {
    const token = hub.token;

    const regResp = await fetch(`${baseUrl}/api/sessions/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ project: "Anvil", cwd: "/path", pid: 1234 }),
    });
    expect(regResp.status).toBe(201);

    const listResp = await fetch(`${baseUrl}/api/sessions`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const { sessions } = await listResp.json();
    expect(sessions).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd C:/Users/Jay/OneDrive/Desktop/Alamo-Crafting-Forge && npx vitest run packages/openclaw/test/hub/server.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement auth module**

```typescript
// packages/openclaw/src/hub/auth.ts
import { randomBytes } from "crypto";
import { existsSync, readFileSync, writeFileSync, mkdirSync, chmodSync } from "fs";
import { resolve, dirname } from "path";

export function loadOrCreateToken(tokenPath: string): string {
  if (existsSync(tokenPath)) {
    try {
      const data = JSON.parse(readFileSync(tokenPath, "utf-8"));
      if (data.token) return data.token;
    } catch {
      // Regenerate
    }
  }

  const token = randomBytes(32).toString("hex");
  const dir = dirname(tokenPath);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(tokenPath, JSON.stringify({ token }, null, 2), "utf-8");
  try { chmodSync(tokenPath, 0o600); } catch { /* Windows may not support chmod */ }
  return token;
}

export function validateToken(authHeader: string | undefined, expectedToken: string): boolean {
  if (!authHeader) return false;
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  return !!match && match[1] === expectedToken;
}
```

- [ ] **Step 4: Implement Hub server**

```typescript
// packages/openclaw/src/hub/server.ts
import { createServer, type IncomingMessage, type ServerResponse, type Server } from "http";
import { resolve } from "path";
import { OpenClawDatabase } from "../db/database.js";
import { createEventLog, type EventLog } from "./event-log.js";
import { createApprovals, type Approvals } from "./approvals.js";
import { createSessions, type Sessions } from "./sessions.js";
import { loadOrCreateToken, validateToken } from "./auth.js";
import { createDeliveryLoop, type DeliveryLoop } from "./delivery.js";
import type { QaEventType } from "@openclaw/protocol-qa";

const MAX_BODY = 1024 * 1024;

interface HubOptions {
  dbPath: string;
  port?: number;
  tokenPath?: string;
  configPath?: string;
  logFile?: string;
}

export interface Hub {
  token: string;
  port: number;
  stop(): Promise<void>;
}

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = "";
    let size = 0;
    req.on("data", (chunk: Buffer) => {
      size += chunk.length;
      if (size > MAX_BODY) { req.destroy(); reject(new Error("Body too large")); return; }
      data += chunk;
    });
    req.on("end", () => resolve(data));
    req.on("error", reject);
  });
}

function json(res: ServerResponse, status: number, data: unknown): void {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(data));
}

export async function createHub(opts: HubOptions): Promise<Hub> {
  const port = opts.port ?? 7700;
  const db = new OpenClawDatabase(opts.dbPath);
  const eventLog = createEventLog(db);
  const approvals = createApprovals(db, eventLog);
  const sessions = createSessions(db, eventLog);

  const tokenPath = opts.tokenPath ?? resolve(opts.dbPath, "..", "dashboard-token.json");
  const token = loadOrCreateToken(tokenPath);

  eventLog.append("system.startup", "hub", null, { port });

  let reaperInterval: ReturnType<typeof setInterval> | null = null;
  let deliveryStop: (() => void) | null = null;

  async function handleRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const url = new URL(req.url || "/", `http://localhost`);
    const method = req.method || "GET";
    let path = url.pathname;

    // Normalize: /api/X -> /X
    if (path.startsWith("/api/")) path = path.slice(4);

    // Auth: exempt /status
    if (path !== "/status") {
      if (!validateToken(req.headers.authorization, token)) {
        return json(res, 401, { error: "Unauthorized" });
      }
    }

    try {
      // ── Status ──
      if (method === "GET" && path === "/status") {
        return json(res, 200, {
          hub: "running",
          active_sessions: sessions.getActive().length,
          pending_approvals: approvals.getPending().length,
          timestamp: new Date().toISOString(),
        });
      }

      // ── Approvals ──
      if (method === "GET" && path === "/approvals") {
        const project = url.searchParams.get("project");
        return json(res, 200, { approvals: approvals.getPending(project || undefined) });
      }

      if (method === "GET" && path.startsWith("/approvals/")) {
        const id = decodeURIComponent(path.slice("/approvals/".length));
        const proposal = approvals.get(id);
        return proposal ? json(res, 200, { proposal }) : json(res, 404, { error: "Not found" });
      }

      if (method === "POST" && path === "/approvals") {
        let body: Record<string, unknown>;
        try { body = JSON.parse(await readBody(req)); } catch { return json(res, 400, { error: "Invalid JSON" }); }
        if (!body.project || !body.title || !body.intent || !body.impact) {
          return json(res, 400, { error: "Missing: project, title, intent, impact" });
        }
        const proposal = approvals.create(
          body.project as string, body.title as string, body.intent as string,
          body.impact as string, (body.requested_by as string) || "unknown", body.diff as string | undefined
        );
        return json(res, 201, { proposal });
      }

      if (method === "POST" && path === "/approvals/decide") {
        let body: Record<string, unknown>;
        try { body = JSON.parse(await readBody(req)); } catch { return json(res, 400, { error: "Invalid JSON" }); }
        if (!body.proposal_id || !body.decision) {
          return json(res, 400, { error: "Missing: proposal_id, decision" });
        }
        const valid = ["approved", "rejected", "commented"];
        if (!valid.includes(body.decision as string)) {
          return json(res, 400, { error: `decision must be: ${valid.join(", ")}` });
        }
        const result = approvals.decide(
          body.proposal_id as string,
          body.decision as "approved" | "rejected" | "commented",
          body.response as string
        );
        return result ? json(res, 200, { proposal: result }) : json(res, 404, { error: "Not found or decided" });
      }

      // ── Sessions ──
      if (method === "GET" && path === "/sessions") {
        return json(res, 200, { sessions: sessions.getActive() });
      }

      if (method === "GET" && path.startsWith("/sessions/")) {
        const id = path.slice("/sessions/".length);
        const session = sessions.get(id);
        return session ? json(res, 200, { session }) : json(res, 404, { error: "Not found" });
      }

      if (method === "POST" && path === "/sessions/register") {
        let body: Record<string, unknown>;
        try { body = JSON.parse(await readBody(req)); } catch { return json(res, 400, { error: "Invalid JSON" }); }
        if (!body.project || !body.cwd) return json(res, 400, { error: "Missing: project, cwd" });
        const session = sessions.register(body.project as string, body.cwd as string, (body.pid as number) || 0, body.id as string);
        return json(res, 201, { session });
      }

      if (method === "POST" && path === "/sessions/heartbeat") {
        let body: Record<string, unknown>;
        try { body = JSON.parse(await readBody(req)); } catch { return json(res, 400, { error: "Invalid JSON" }); }
        if (!body.session_id) return json(res, 400, { error: "Missing: session_id" });
        const ok = sessions.heartbeat(body.session_id as string, body.activity as string);
        return json(res, ok ? 200 : 404, { ok });
      }

      if (method === "POST" && path === "/sessions/end") {
        let body: Record<string, unknown>;
        try { body = JSON.parse(await readBody(req)); } catch { return json(res, 400, { error: "Invalid JSON" }); }
        if (!body.session_id) return json(res, 400, { error: "Missing: session_id" });
        const ok = sessions.end(body.session_id as string);
        return json(res, ok ? 200 : 404, { ok });
      }

      // ── Events ──
      if (method === "GET" && path === "/events") {
        const type = url.searchParams.get("type") as QaEventType | null;
        const project = url.searchParams.get("project");
        const limit = url.searchParams.get("limit");
        const events = eventLog.getEvents({
          type: type || undefined,
          project: project || undefined,
          limit: limit ? parseInt(limit) : 50,
        });
        return json(res, 200, { events });
      }

      if (method === "POST" && path === "/events") {
        let body: Record<string, unknown>;
        try { body = JSON.parse(await readBody(req)); } catch { return json(res, 400, { error: "Invalid JSON" }); }
        if (!body.type || !body.source) return json(res, 400, { error: "Missing: type, source" });
        try {
          const event = eventLog.append(
            body.type as string, body.source as string,
            (body.project as string) || null, (body.payload as Record<string, unknown>) || {}
          );
          return json(res, 201, { event });
        } catch (err) {
          return json(res, 400, { error: err instanceof Error ? err.message : "Invalid event type" });
        }
      }

      json(res, 404, { error: "Not found" });
    } catch (err) {
      json(res, 500, { error: err instanceof Error ? err.message : "Internal error" });
    }
  }

  return new Promise((resolvePromise, reject) => {
    const server: Server = createServer((req, res) => {
      handleRequest(req, res).catch((err) => json(res, 500, { error: String(err) }));
    });

    server.on("error", (err: NodeJS.ErrnoException) => {
      if (err.code === "EADDRINUSE") {
        reject(new Error(`Port ${port} in use`));
      } else {
        reject(err);
      }
    });

    server.listen(port, "127.0.0.1", () => {
      reaperInterval = setInterval(() => sessions.reapDead(120), 60_000);

      // Start delivery loop if config is available
      if (opts.configPath) {
        const logFile = opts.logFile ?? resolve(opts.dbPath, "..", "..", ".boardroom", "telegram-log.md");
        const loop = createDeliveryLoop(approvals, db, opts.configPath, logFile);
        deliveryStop = loop.startInterval(30_000).stop;
      }

      resolvePromise({
        token,
        port,
        async stop() {
          if (deliveryStop) deliveryStop();
          if (reaperInterval) clearInterval(reaperInterval);
          eventLog.append("system.shutdown", "hub", null, {});
          return new Promise<void>((r) => {
            server.close(() => { db.close(); r(); });
          });
        },
      });
    });
  });
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd C:/Users/Jay/OneDrive/Desktop/Alamo-Crafting-Forge && npx vitest run packages/openclaw/test/hub/server.test.ts`
Expected: PASS

- [ ] **Step 6: Export from index and commit**

Update `packages/openclaw/src/index.ts` to add:
```typescript
export { createHub, type Hub } from "./hub/server.js";
export { OpenClawDatabase } from "./db/database.js";
export { createEventLog, type EventLog } from "./hub/event-log.js";
export { createApprovals, type Approvals } from "./hub/approvals.js";
export { createSessions, type Sessions } from "./hub/sessions.js";
```

```bash
git add packages/openclaw/src/hub/ packages/openclaw/src/db/ packages/openclaw/test/hub/
git commit -m "feat(openclaw): add Hub HTTP server with approvals, sessions, events

Localhost-only API with token auth. SQLite-backed approvals
lifecycle, session management with dead-session reaping,
append-only event log with checksums."
```

---

## Chunk 5: CLI Tools + Integration

### Task 11: await-decision CLI

**Files:**
- Create: `packages/openclaw/src/cli/await-decision.ts`
- Create: `packages/openclaw/test/cli/await-decision.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// packages/openclaw/test/cli/await-decision.test.ts
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mkdirSync, rmSync, writeFileSync, readFileSync } from "fs";
import { resolve } from "path";
import { tmpdir } from "os";
import { randomBytes } from "crypto";
import { createHub, type Hub } from "../../src/hub/server.js";
import { awaitDecision, type AwaitDecisionArgs } from "../../src/cli/await-decision.js";

describe("await-decision", () => {
  let dataDir: string;
  let hub: Hub;
  let port: number;

  beforeEach(async () => {
    dataDir = resolve(tmpdir(), `openclaw-await-${randomBytes(4).toString("hex")}`);
    mkdirSync(dataDir, { recursive: true });
    port = 18700 + Math.floor(Math.random() * 1000);
    hub = await createHub({ dbPath: resolve(dataDir, "hub.sqlite"), port });
  });

  afterEach(async () => {
    await hub.stop();
    rmSync(dataDir, { recursive: true, force: true });
  });

  it("creates a Hub proposal", async () => {
    const result = await awaitDecision({
      project: "Anvil",
      title: "Deploy v2",
      intent: "Ship",
      impact: "3 files",
      hubUrl: `http://127.0.0.1:${port}`,
      hubToken: hub.token,
      pollTimeoutMs: 100, // Short timeout for test
    });

    // Should timeout since nobody decided
    expect(result.status).toBe("timeout");
    expect(result.proposalId).toMatch(/^proposal:/);
  });

  it("detects pre-existing approved proposal", async () => {
    // Pre-create and approve a proposal via Hub API
    const createResp = await fetch(`http://127.0.0.1:${port}/api/approvals`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${hub.token}` },
      body: JSON.stringify({
        project: "Anvil", title: "Deploy v2", intent: "Ship", impact: "3 files", requested_by: "test",
      }),
    });
    const { proposal } = await createResp.json();

    await fetch(`http://127.0.0.1:${port}/api/approvals/decide`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${hub.token}` },
      body: JSON.stringify({ proposal_id: proposal.id, decision: "approved", response: "ok" }),
    });

    const result = await awaitDecision({
      project: "Anvil",
      title: "Deploy v2",
      intent: "Ship",
      impact: "3 files",
      hubUrl: `http://127.0.0.1:${port}`,
      hubToken: hub.token,
      pollTimeoutMs: 5000,
      existingProposalId: proposal.id,
    });

    expect(result.status).toBe("approved");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd C:/Users/Jay/OneDrive/Desktop/Alamo-Crafting-Forge && npx vitest run packages/openclaw/test/cli/await-decision.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement await-decision as importable module + CLI**

```typescript
// packages/openclaw/src/cli/await-decision.ts
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { createNotifier } from "../notify.js";
import type { ApprovalDecision, ApprovalMessage } from "@openclaw/protocol-qa";

const __dirname = dirname(fileURLToPath(import.meta.url));

export interface AwaitDecisionArgs {
  project: string;
  title: string;
  intent: string;
  impact: string;
  hubUrl?: string;
  hubToken?: string;
  pollTimeoutMs?: number;
  existingProposalId?: string;
}

export interface AwaitDecisionResult {
  status: "approved" | "rejected" | "commented" | "timeout" | "hub-unreachable";
  proposalId?: string;
  response?: string;
}

async function hubFetch(hubUrl: string, token: string, path: string, init?: RequestInit): Promise<Response | null> {
  try {
    return await fetch(`${hubUrl}/api${path}`, {
      ...init,
      headers: { ...init?.headers, Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(5000),
    });
  } catch {
    return null;
  }
}

export async function awaitDecision(args: AwaitDecisionArgs): Promise<AwaitDecisionResult> {
  const hubUrl = args.hubUrl || process.env.HUB_URL || "http://127.0.0.1:7700";
  const token = args.hubToken || process.env.HUB_TOKEN || "";
  const timeout = args.pollTimeoutMs ?? 600_000;

  let proposalId = args.existingProposalId;

  // Check existing proposal first
  if (proposalId) {
    const resp = await hubFetch(hubUrl, token, `/approvals/${encodeURIComponent(proposalId)}`);
    if (resp?.ok) {
      const data = (await resp.json()) as { proposal?: { status: string; ceo_response: string | null } };
      if (data.proposal && data.proposal.status !== "pending") {
        return {
          status: data.proposal.status as ApprovalDecision,
          proposalId,
          response: data.proposal.ceo_response || undefined,
        };
      }
    }
  }

  // Create new proposal if needed
  if (!proposalId) {
    const resp = await hubFetch(hubUrl, token, "/approvals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        project: args.project,
        title: args.title,
        intent: args.intent,
        impact: args.impact,
        requested_by: "governance-gate",
      }),
    });

    if (!resp?.ok) {
      // Hub unreachable — send direct Telegram as fallback (delivery loop can't help)
      const configPath = resolve(__dirname, "..", "..", "config", "telegram-config.json");
      const logFile = resolve(__dirname, "..", "..", ".boardroom", "telegram-log.md");
      const { sendApproval } = createNotifier(configPath, logFile);
      const message = `*Governance Gate: ${args.title}*\n\n*Project:* ${args.project}\n*Intent:* ${args.intent}\n*Impact:* ${args.impact}`;
      const shadowId = `shadow:${Date.now().toString(36)}`;
      await sendApproval("actions", message, shadowId);
      return { status: "hub-unreachable" };
    }

    const data = (await resp.json()) as { proposal?: { id: string } };
    proposalId = data.proposal?.id;
    if (!proposalId) return { status: "hub-unreachable" };

    // NOTE: Telegram delivery is handled by the Hub's delivery loop (delivery.ts).
    // await-decision does NOT send directly to avoid duplicate messages.
    // The delivery loop polls pending proposals every 30s and sends to Telegram.
  }

  // Poll for decision
  const deadline = Date.now() + timeout;
  const pollInterval = 2000;

  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, pollInterval));

    const resp = await hubFetch(hubUrl, token, `/approvals/${encodeURIComponent(proposalId)}`);
    if (resp?.ok) {
      const data = (await resp.json()) as { proposal?: { status: string; ceo_response: string | null } };
      if (data.proposal && data.proposal.status !== "pending") {
        return {
          status: data.proposal.status as ApprovalDecision,
          proposalId,
          response: data.proposal.ceo_response || undefined,
        };
      }
    }
  }

  return { status: "timeout", proposalId };
}

// CLI entry point
if (process.argv[1] && (process.argv[1].endsWith("await-decision.ts") || process.argv[1].endsWith("await-decision.js"))) {
  const args = process.argv.slice(2);
  const get = (flag: string): string | undefined => {
    const idx = args.indexOf(flag);
    return idx !== -1 && args[idx + 1] ? args[idx + 1] : undefined;
  };

  const project = get("--project");
  const title = get("--title");
  const intent = get("--intent");
  const impact = get("--impact");
  const timeoutStr = get("--timeout");

  if (!project || !title || !intent || !impact) {
    console.error("Usage: npx tsx src/cli/await-decision.ts --project <name> --title <title> --intent <intent> --impact <impact> [--timeout <seconds>]");
    console.error("Exit codes: 0=approved, 1=rejected, 2=timeout, 3=hub-unreachable");
    process.exit(2);
  }

  const timeoutSec = timeoutStr ? parseInt(timeoutStr, 10) : 600;

  awaitDecision({
    project,
    title,
    intent,
    impact,
    pollTimeoutMs: (isNaN(timeoutSec) || timeoutSec <= 0 ? 600 : timeoutSec) * 1000,
  }).then((result) => {
    console.log(JSON.stringify(result));
    switch (result.status) {
      case "approved": process.exit(0); break;
      case "rejected":
      case "commented": process.exit(1); break;
      case "timeout": process.exit(2); break;
      case "hub-unreachable": process.exit(3); break;
    }
  });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd C:/Users/Jay/OneDrive/Desktop/Alamo-Crafting-Forge && npx vitest run packages/openclaw/test/cli/await-decision.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/openclaw/src/cli/await-decision.ts packages/openclaw/test/cli/await-decision.test.ts
git commit -m "feat(openclaw): add await-decision CLI for governance approvals

Creates Hub proposal, polls for CEO decision. Fallback to
direct Telegram send if Hub unreachable. Exit codes:
0=approved, 1=rejected, 2=timeout, 3=hub-unreachable."
```

---

### Task 12: Hub CLI Entry Point

**Files:**
- Create: `packages/openclaw/src/cli/hub.ts`

- [ ] **Step 1: Implement Hub CLI**

```typescript
// packages/openclaw/src/cli/hub.ts
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { createHub } from "../hub/server.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = resolve(process.env.DATA_DIR || resolve(__dirname, "..", "..", "data"), "hub.sqlite");
const PORT = parseInt(process.env.HUB_PORT || "7700", 10);

async function main(): Promise<void> {
  console.log(`Starting OpenClaw Hub on port ${PORT}...`);
  console.log(`Database: ${DB_PATH}`);

  const CONFIG_PATH = resolve(__dirname, "..", "..", "config", "telegram-config.json");
  const LOG_FILE = resolve(__dirname, "..", "..", ".boardroom", "telegram-log.md");

  const hub = await createHub({ dbPath: DB_PATH, port: PORT, configPath: CONFIG_PATH, logFile: LOG_FILE });

  console.log(`Hub running at http://127.0.0.1:${PORT}`);
  console.log(`Token file: ${resolve(DB_PATH, "..", "dashboard-token.json")}`);

  const shutdown = async (signal: string) => {
    console.log(`\n${signal} received — shutting down...`);
    await hub.stop();
    process.exit(0);
  };

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
}

main().catch((err) => {
  console.error("Hub failed to start:", err.message);
  process.exit(1);
});
```

- [ ] **Step 2: Commit**

```bash
git add packages/openclaw/src/cli/hub.ts
git commit -m "feat(openclaw): add Hub CLI entry point

Usage: npm run hub (starts Hub HTTP server on port 7700)"
```

---

### Task 13: Delivery Loop — Poll Pending Proposals → Send to Telegram

**Files:**
- Create: `packages/openclaw/src/hub/delivery.ts`
- Create: `packages/openclaw/test/hub/delivery.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// packages/openclaw/test/hub/delivery.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mkdirSync, rmSync, writeFileSync } from "fs";
import { resolve } from "path";
import { tmpdir } from "os";
import { randomBytes } from "crypto";
import { OpenClawDatabase } from "../../src/db/database.js";
import { createEventLog } from "../../src/hub/event-log.js";
import { createApprovals } from "../../src/hub/approvals.js";
import { createDeliveryLoop } from "../../src/hub/delivery.js";

describe("Delivery Loop", () => {
  let dataDir: string;
  let db: OpenClawDatabase;
  let approvals: ReturnType<typeof createApprovals>;
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    dataDir = resolve(tmpdir(), `openclaw-delivery-${randomBytes(4).toString("hex")}`);
    mkdirSync(dataDir, { recursive: true });
    db = new OpenClawDatabase(resolve(dataDir, "hub.sqlite"));
    const eventLog = createEventLog(db);
    approvals = createApprovals(db, eventLog);
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    db.close();
    vi.unstubAllGlobals();
    rmSync(dataDir, { recursive: true, force: true });
  });

  it("delivers pending proposals to Telegram", async () => {
    fetchMock.mockResolvedValue({
      json: () => Promise.resolve({ ok: true }),
      status: 200,
    });

    const configPath = resolve(dataDir, "config.json");
    writeFileSync(configPath, JSON.stringify({
      bot_token: "test", chat_id: "-100", topics: { actions: 1 },
    }));

    approvals.create("Anvil", "Deploy v2", "Ship", "3 files", "gate");

    const deliver = createDeliveryLoop(approvals, db, configPath, resolve(dataDir, "log.md"));
    const delivered = await deliver.tick();

    expect(delivered).toBe(1);
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it("skips already-delivered proposals (persisted across instances)", async () => {
    fetchMock.mockResolvedValue({
      json: () => Promise.resolve({ ok: true }),
      status: 200,
    });

    const configPath = resolve(dataDir, "config.json");
    writeFileSync(configPath, JSON.stringify({
      bot_token: "test", chat_id: "-100", topics: { actions: 1 },
    }));

    approvals.create("Anvil", "Deploy v2", "Ship", "3 files", "gate");

    const deliver1 = createDeliveryLoop(approvals, db, configPath, resolve(dataDir, "log.md"));
    await deliver1.tick();

    // Simulate restart — new delivery loop instance, same DB
    const deliver2 = createDeliveryLoop(approvals, db, configPath, resolve(dataDir, "log.md"));
    const secondRun = await deliver2.tick();

    expect(secondRun).toBe(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd C:/Users/Jay/OneDrive/Desktop/Alamo-Crafting-Forge && npx vitest run packages/openclaw/test/hub/delivery.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement delivery loop**

```typescript
// packages/openclaw/src/hub/delivery.ts
import type { Approvals } from "./approvals.js";
import type { OpenClawDatabase } from "../db/database.js";
import { createNotifier } from "../notify.js";
import { resetConfig } from "../config.js";

export function createDeliveryLoop(
  approvals: Approvals,
  db: OpenClawDatabase,
  configPath: string,
  logFile: string
) {
  // Delivery state persisted in SQLite to survive restarts
  db.raw.exec(`
    CREATE TABLE IF NOT EXISTS delivery_log (
      proposal_id TEXT PRIMARY KEY,
      delivered_at TEXT NOT NULL
    )
  `);

  const isDeliveredStmt = db.raw.prepare("SELECT 1 FROM delivery_log WHERE proposal_id = ?");
  const markDeliveredStmt = db.raw.prepare("INSERT OR IGNORE INTO delivery_log (proposal_id, delivered_at) VALUES (?, ?)");

  async function tick(): Promise<number> {
    const pending = approvals.getPending();
    let count = 0;

    for (const proposal of pending) {
      if (isDeliveredStmt.get(proposal.id)) continue;

      resetConfig();
      const { sendApproval } = createNotifier(configPath, logFile);
      const message = [
        `*Governance Gate: ${proposal.title}*`,
        "",
        `*Project:* ${proposal.project}`,
        `*Intent:* ${proposal.intent}`,
        `*Impact:* ${proposal.impact}`,
      ].join("\n");

      const sent = await sendApproval("actions", message, proposal.id);
      if (sent) {
        markDeliveredStmt.run(proposal.id, new Date().toISOString());
        count++;
      }
    }

    return count;
  }

  function startInterval(intervalMs = 30_000): { stop: () => void } {
    // Tick immediately on start, then on interval
    tick().catch(() => {});
    const id = setInterval(() => { tick().catch(() => {}); }, intervalMs);
    return { stop: () => clearInterval(id) };
  }

  return { tick, startInterval };
}

export type DeliveryLoop = ReturnType<typeof createDeliveryLoop>;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd C:/Users/Jay/OneDrive/Desktop/Alamo-Crafting-Forge && npx vitest run packages/openclaw/test/hub/delivery.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/openclaw/src/hub/delivery.ts packages/openclaw/test/hub/delivery.test.ts
git commit -m "feat(openclaw): add delivery loop — polls pending proposals, sends to Telegram

Tracks delivered IDs to avoid duplicates. Runs on configurable
interval (default 30s). Completes the approval delivery chain."
```

---

### Task 14: E2E Approval Flow Test

**Files:**
- Create: `packages/openclaw/test/e2e/approval-flow.test.ts`

- [ ] **Step 1: Write the E2E test**

```typescript
// packages/openclaw/test/e2e/approval-flow.test.ts
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mkdirSync, rmSync, writeFileSync } from "fs";
import { resolve } from "path";
import { tmpdir } from "os";
import { randomBytes } from "crypto";
import { createHub, type Hub } from "../../src/hub/server.js";
import { awaitDecision } from "../../src/cli/await-decision.js";

describe("E2E: Approval Flow", () => {
  let dataDir: string;
  let hub: Hub;
  let port: number;
  let configPath: string;
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    dataDir = resolve(tmpdir(), `openclaw-e2e-${randomBytes(4).toString("hex")}`);
    mkdirSync(dataDir, { recursive: true });
    port = 19700 + Math.floor(Math.random() * 1000);

    configPath = resolve(dataDir, "config.json");
    writeFileSync(configPath, JSON.stringify({
      bot_token: "test", chat_id: "-100", topics: { actions: 1 },
    }));

    hub = await createHub({
      dbPath: resolve(dataDir, "hub.sqlite"),
      port,
      configPath,
      logFile: resolve(dataDir, "log.md"),
    });

    // Mock fetch for Telegram API calls only (let Hub calls go through)
    const originalFetch = globalThis.fetch;
    fetchMock = vi.fn((url: string, init?: RequestInit) => {
      if (typeof url === "string" && url.includes("api.telegram.org")) {
        return Promise.resolve({
          json: () => Promise.resolve({ ok: true, result: { message_id: 999 } }),
          status: 200,
        } as Response);
      }
      return originalFetch(url, init);
    });
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(async () => {
    vi.unstubAllGlobals();
    await hub.stop();
    rmSync(dataDir, { recursive: true, force: true });
  });

  it("full flow: create proposal → delivery loop sends Telegram → CEO decides → poll returns approved", async () => {
    // Start await-decision in background with short timeout
    // Telegram delivery is handled by the Hub's delivery loop, not await-decision
    const decisionPromise = awaitDecision({
      project: "Anvil",
      title: "Deploy v2",
      intent: "Ship latest changes",
      impact: "3 files modified",
      hubUrl: `http://127.0.0.1:${port}`,
      hubToken: hub.token,
      pollTimeoutMs: 10_000,
    });

    // Wait for proposal to be created
    await new Promise((r) => setTimeout(r, 500));

    // CEO approves via Hub API (simulating Telegram callback → Hub decide)
    const listResp = await fetch(`http://127.0.0.1:${port}/api/approvals`, {
      headers: { Authorization: `Bearer ${hub.token}` },
    });
    const { approvals } = await listResp.json() as { approvals: { id: string }[] };
    expect(approvals).toHaveLength(1);

    await fetch(`http://127.0.0.1:${port}/api/approvals/decide`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${hub.token}` },
      body: JSON.stringify({ proposal_id: approvals[0].id, decision: "approved", response: "Ship it" }),
    });

    // await-decision should resolve with approved
    const result = await decisionPromise;
    expect(result.status).toBe("approved");
    expect(result.response).toBe("Ship it");

    // Verify Telegram was called
    const telegramCalls = fetchMock.mock.calls.filter(
      (c: [string, ...unknown[]]) => typeof c[0] === "string" && c[0].includes("api.telegram.org")
    );
    expect(telegramCalls.length).toBeGreaterThan(0);
  });

  it("full flow: create proposal → CEO rejects → poll returns rejected", async () => {
    const decisionPromise = awaitDecision({
      project: "Anvil",
      title: "Risky Deploy",
      intent: "Deploy untested",
      impact: "Production",
      hubUrl: `http://127.0.0.1:${port}`,
      hubToken: hub.token,
      pollTimeoutMs: 10_000,
    });

    await new Promise((r) => setTimeout(r, 500));

    const listResp = await fetch(`http://127.0.0.1:${port}/api/approvals`, {
      headers: { Authorization: `Bearer ${hub.token}` },
    });
    const { approvals } = await listResp.json() as { approvals: { id: string }[] };

    await fetch(`http://127.0.0.1:${port}/api/approvals/decide`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${hub.token}` },
      body: JSON.stringify({ proposal_id: approvals[0].id, decision: "rejected", response: "Not ready" }),
    });

    const result = await decisionPromise;
    expect(result.status).toBe("rejected");
    expect(result.response).toBe("Not ready");
  });
});
```

- [ ] **Step 2: Run the E2E test**

Run: `cd C:/Users/Jay/OneDrive/Desktop/Alamo-Crafting-Forge && npx vitest run packages/openclaw/test/e2e/approval-flow.test.ts`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add packages/openclaw/test/e2e/
git commit -m "test(openclaw): add E2E approval flow tests

Full lifecycle: create proposal → Telegram delivery → CEO
decides via Hub API → await-decision returns result. Tests
both approve and reject paths."
```

---

### Task 15: Update Protocol References

**Files:**
- Modify: `C:/Users/Jay/OneDrive/Desktop/Agents/protocols/qa-gateway.md`

- [ ] **Step 1: Update qa-gateway.md OpenClaw paths**

Replace all references from:
- `~/Desktop/OpenClaw/src/notify.ts` → `~/Desktop/Alamo-Crafting-Forge/packages/openclaw/src/cli/notify.ts`
- `~/Desktop/OpenClaw/config/telegram-config.json` → `~/Desktop/Alamo-Crafting-Forge/packages/openclaw/config/telegram-config.json`
- `~/Desktop/OpenClaw/.boardroom/telegram-log.md` → `~/Desktop/Alamo-Crafting-Forge/packages/openclaw/.boardroom/telegram-log.md`
- `cd "C:/Users/Jay/OneDrive/Desktop/OpenClaw"` → `cd "C:/Users/Jay/OneDrive/Desktop/Alamo-Crafting-Forge/packages/openclaw"`

Updated CLI usage:
```bash
npx tsx "C:/Users/Jay/OneDrive/Desktop/Alamo-Crafting-Forge/packages/openclaw/src/cli/notify.ts" <project-folder> "<message>"
```

- [ ] **Step 2: Update governance-gate skill paths**

In `C:/Users/Jay/OneDrive/Desktop/Agents/skills/governance-gate/SKILL.md`, update:
- Hub API URL remains `http://127.0.0.1:7700/api/approvals` (unchanged)
- Token path: `C:/Users/Jay/OneDrive/Desktop/Alamo-Crafting-Forge/packages/openclaw/data/dashboard-token.json`
- `await-decision` invocation: `cd "C:/Users/Jay/OneDrive/Desktop/Alamo-Crafting-Forge/packages/openclaw" && npm run await-decision -- ...`
- `notify` invocation: `cd "C:/Users/Jay/OneDrive/Desktop/Alamo-Crafting-Forge/packages/openclaw" && npm run notify -- ...`

- [ ] **Step 3: Commit**

```bash
git -C "C:/Users/Jay/OneDrive/Desktop/Agents" add protocols/qa-gateway.md skills/governance-gate/SKILL.md
git -C "C:/Users/Jay/OneDrive/Desktop/Agents" commit -m "fix: update OpenClaw paths to monorepo location

OpenClaw now lives at Alamo-Crafting-Forge/packages/openclaw/
instead of ~/Desktop/OpenClaw/."
```

---

### Task 16: Run Full Test Suite + Final Verification

- [ ] **Step 1: Install all dependencies**

Run: `cd C:/Users/Jay/OneDrive/Desktop/Alamo-Crafting-Forge && pnpm install`
Expected: Clean install with new workspace packages resolved

- [ ] **Step 2: Build protocol-qa**

Run: `cd C:/Users/Jay/OneDrive/Desktop/Alamo-Crafting-Forge/packages/protocol-qa && pnpm build`
Expected: Clean TypeScript compilation

- [ ] **Step 3: Build openclaw**

Run: `cd C:/Users/Jay/OneDrive/Desktop/Alamo-Crafting-Forge/packages/openclaw && pnpm build`
Expected: Clean TypeScript compilation

- [ ] **Step 4: Run all openclaw tests**

Run: `cd C:/Users/Jay/OneDrive/Desktop/Alamo-Crafting-Forge && npx vitest run packages/openclaw/ packages/protocol-qa/`
Expected: All tests PASS

- [ ] **Step 5: Run existing ServiceBot tests (regression check)**

Run: `cd C:/Users/Jay/OneDrive/Desktop/Alamo-Crafting-Forge && pnpm test`
Expected: All existing 187+ tests still PASS — zero regression

- [ ] **Step 6: Verify no imports between domains**

Run: `grep -r "@servicebot/core" packages/openclaw/ packages/protocol-qa/` — should return nothing
Run: `grep -r "@openclaw" packages/core/ service/ src/` — should return nothing

Expected: Zero cross-domain imports

- [ ] **Step 7: Final commit**

```bash
git add .
git commit -m "chore: verify OpenClaw integration — all tests pass, zero cross-domain imports"
```

---

## Rollback

If any task fails catastrophically:

```bash
cd C:/Users/Jay/OneDrive/Desktop/Alamo-Crafting-Forge
git log --oneline -10  # Find last good commit
git revert <bad-commit>
```

Packages are isolated — removing `packages/openclaw/` and `packages/protocol-qa/` leaves ServiceBot completely unaffected. No shared tables, no shared imports, no shared config.
