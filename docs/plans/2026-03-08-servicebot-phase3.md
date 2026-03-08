# ServiceBot Phase 3 — Production Readiness Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Close all 5 council-identified production gaps: background email polling, ticket lifecycle state machine, SMTP error recovery with retry, resolution timestamps for SLA reporting, and field-optimized mobile technician UX.

**Architecture:** The polling runner is a standalone Node.js process (`service/src/poller.ts`) using the existing `processNewEmails` function on a configurable interval. Ticket lifecycle adds `resolved` and `pending` statuses to the existing `TicketStatus` type with a new `updateTicketStatus` DB method and API route. SMTP error recovery wraps `sendApprovedDraft` in try/catch, stores failures in a new `send_attempts` table, and adds a retry API + UI. Resolution timestamps use the existing `updated_at` column on status change. The field-optimized mobile UX is a dedicated `/admin/servicebot/field` page with large tap targets, high-contrast design, and a simplified ticket close workflow.

**Tech Stack:** TypeScript, Next.js 16, pnpm workspaces, SQLite (better-sqlite3), Vitest, nodemailer

**Governance:** Strategic Deliverable — council sign-off 2026-03-08. CEO approved in-session. Gemini plan approval: APPROVED (R2, 4 findings incorporated).

---

## Index Evidence

| Field | Value |
|-|-|
| mcp_server | connected |
| repo | `local/Alamo-Crafting-Forge` |
| indexed_at | `2026-03-08T01:40:29.049786` (reindexed_this_run) |

**Queries used:**
- `search_symbols`: `ticket state status lifecycle close resolve` (15 results)
- `search_symbols`: `process email poll fetch mailer send smtp retry` (15 results)
- `search_symbols`: `scheduler recurring task runner worker` (10 results)
- `get_file_outline`: `packages/core/src/tasks/state-machine.ts` (2 symbols)
- `get_file_outline`: `packages/core/src/email/smtp/sender.ts` (3 symbols)
- `get_repo_outline`: 64 files, 183 symbols

**Files/symbols consulted:**
- `packages/core/src/db/database.ts` — `ServiceBotDatabase` (class, 38 methods)
- `packages/core/src/db/types.ts` — `TicketStatus`, `Ticket`, `Task`, `Draft`, `TaskState`
- `packages/core/src/tasks/state-machine.ts` — `isValidTransition`, `transition`
- `packages/core/src/email/smtp/sender.ts` — `sendApprovedDraft`, `SendApprovedDraftResult`
- `packages/core/src/email/gmail/fetcher.ts` — `fetchNewMessages`, `extractEmailData`
- `packages/core/src/email/gmail/auth.ts` — `GmailAuthOptions`, `getAuthClient`
- `packages/core/src/config/types.ts` — `SubsidiaryConfig` (full schema)
- `service/src/index.ts` — `processNewEmails`, `ProcessNewEmailsDeps`
- `service/src/scheduler.ts` — `runScheduler`, `SchedulerDeps`
- `service/src/webhook-worker.ts` — `processWebhookRetries`
- `src/lib/servicebot/server.ts` — `getServiceBotDb`, `getMailer`, `getSubsidiarySmtpConfig`
- `src/lib/servicebot/client.ts` — `fetchTickets`, `fetchTicket`, `approveDraft`
- `src/app/api/admin/servicebot/drafts/[id]/approve/route.ts` — approve flow
- `src/app/admin/servicebot/tickets/[id]/page.tsx` — ticket detail page
- `packages/core/src/db/migrations/001_init.sql` — full schema
- `packages/core/src/db/migrations/002_phase2_outbound_webhooks.sql` — drafts columns + webhook_attempts

---

## Track 1 — Background Email Polling Runner

### Task 1: Create the email polling runner

**Context:** `processNewEmails` in `service/src/index.ts` handles the full intake pipeline (fetch → parse → match → classify → draft). The scheduler pattern in `service/src/scheduler.ts` shows how to build an interval-based runner with a stop handle. The poller needs to load subsidiary configs, create a Claude client, and call `processNewEmails` on a loop.

**Files:**
- Create: `service/src/poller.ts`
- Test: `service/test/poller.test.ts`

**Step 1: Write the failing test**

Add `service/test/poller.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock processNewEmails
const mockProcess = vi.fn().mockResolvedValue({ processed: 0, skipped: 0, unmatched: 0, errors: 0, errorDetails: [] });
vi.mock("../src/index", () => ({ processNewEmails: (...args: unknown[]) => mockProcess(...args) }));

import { runPoller } from "../src/poller";

describe("runPoller", () => {
  beforeEach(() => { vi.useFakeTimers(); mockProcess.mockClear(); });
  afterEach(() => { vi.useRealTimers(); });

  it("calls processNewEmails immediately on start", async () => {
    const poller = runPoller({
      db: {} as never,
      configs: [],
      claude: {} as never,
      fetchMessages: vi.fn().mockResolvedValue([]),
      intervalMs: 60_000,
    });

    // Allow the immediate tick to run
    await vi.advanceTimersByTimeAsync(0);
    expect(mockProcess).toHaveBeenCalledTimes(1);
    poller.stop();
  });

  it("calls processNewEmails again after interval", async () => {
    const poller = runPoller({
      db: {} as never,
      configs: [],
      claude: {} as never,
      fetchMessages: vi.fn().mockResolvedValue([]),
      intervalMs: 5_000,
    });

    await vi.advanceTimersByTimeAsync(0);
    expect(mockProcess).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(5_000);
    expect(mockProcess).toHaveBeenCalledTimes(2);
    poller.stop();
  });

  it("prevents overlapping execution if tick is still running", async () => {
    let resolveProcess: (() => void) | undefined;
    mockProcess.mockImplementation(() => new Promise<void>((r) => { resolveProcess = r; }));

    const poller = runPoller({
      db: {} as never,
      configs: [],
      claude: {} as never,
      fetchMessages: vi.fn().mockResolvedValue([]),
      intervalMs: 1_000,
    });

    await vi.advanceTimersByTimeAsync(0);
    expect(mockProcess).toHaveBeenCalledTimes(1);

    // Interval fires while first tick still running
    await vi.advanceTimersByTimeAsync(1_000);
    expect(mockProcess).toHaveBeenCalledTimes(1); // still 1 — guard prevented overlap

    resolveProcess!();
    await vi.advanceTimersByTimeAsync(0);

    await vi.advanceTimersByTimeAsync(1_000);
    expect(mockProcess).toHaveBeenCalledTimes(2); // now runs again
    poller.stop();
  });

  it("stop() prevents further calls", async () => {
    const poller = runPoller({
      db: {} as never,
      configs: [],
      claude: {} as never,
      fetchMessages: vi.fn().mockResolvedValue([]),
      intervalMs: 1_000,
    });

    await vi.advanceTimersByTimeAsync(0);
    poller.stop();

    await vi.advanceTimersByTimeAsync(5_000);
    expect(mockProcess).toHaveBeenCalledTimes(1);
  });
});
```

**Step 2: Run test to verify it fails**

```bash
cd "C:/Users/Jay/OneDrive/Desktop/Alamo-Crafting-Forge"
pnpm --filter @servicebot/service test -- --reporter verbose poller
```
Expected: FAIL — `../src/poller` module not found.

**Step 3: Write the poller**

Create `service/src/poller.ts`:

```typescript
import type { ServiceBotDatabase, SubsidiaryConfig, ClaudeClient, RawEmail } from "@servicebot/core";
import { processNewEmails } from "./index";
import { createLogger } from "@servicebot/core";

export interface PollerDeps {
  db: ServiceBotDatabase;
  configs: SubsidiaryConfig[];
  claude: ClaudeClient;
  fetchMessages: (maxResults?: number) => Promise<RawEmail[]>;
  intervalMs?: number;
  maxResults?: number;
}

export function runPoller(deps: PollerDeps): { stop: () => void } {
  const { db, configs, claude, fetchMessages, intervalMs = 120_000, maxResults = 10 } = deps;
  const logger = createLogger("poller");
  let stopped = false;
  let running = false;

  async function tick(): Promise<void> {
    if (stopped || running) return;
    running = true;
    try {
      const result = await processNewEmails({
        db,
        configs,
        claude,
        fetchMessages,
        maxResults,
        logger,
      });
      if (result.processed > 0 || result.errors > 0) {
        logger.info(`Poll complete: ${result.processed} processed, ${result.errors} errors, ${result.skipped} skipped`);
      }
    } catch (err) {
      logger.error("Poll tick failed", err);
    } finally {
      running = false;
    }
  }

  // Run immediately, then on interval
  tick();
  const handle = setInterval(tick, intervalMs);

  return {
    stop() {
      stopped = true;
      clearInterval(handle);
    },
  };
}
```

**Step 4: Run test to verify it passes**

```bash
pnpm --filter @servicebot/service test -- --reporter verbose poller
```
Expected: PASS — all 3 tests green.

**Step 5: Commit**

```bash
git add service/src/poller.ts service/test/poller.test.ts
git commit -m "feat(service): add email polling runner with configurable interval"
```

---

### Task 2: Create the main entry point CLI for the background service

**Context:** The service package needs a CLI entry point that wires up the DB, loads configs, creates the Claude client, starts the poller, the scheduler, and the webhook worker — all in one process. This is the `npx tsx service/src/cli/run.ts` command that operators will use.

**Files:**
- Create: `service/src/cli/run.ts`

**Step 1: Write the entry point**

Create `service/src/cli/run.ts`:

```typescript
import { ServiceBotDatabase, loadConfigs, createClaudeClient, fetchNewMessages } from "@servicebot/core";
import { runPoller } from "../poller";
import { runScheduler } from "../scheduler";
import { createLogger } from "@servicebot/core";

const logger = createLogger("servicebot");

async function main() {
  const dbPath = process.env.SERVICEBOT_DB_PATH || "./servicebot.db";
  const pollInterval = parseInt(process.env.POLL_INTERVAL_MS || "120000", 10);
  const configDir = process.env.SERVICEBOT_CONFIG_DIR || "./subsidiaries";

  logger.info(`Starting ServiceBot service (db: ${dbPath}, poll: ${pollInterval}ms)`);

  const db = new ServiceBotDatabase(dbPath);
  // Enable WAL mode for concurrent read/write from poller + API
  db.pragma("journal_mode = WAL");

  const configResult = loadConfigs(configDir);

  if (!configResult.valid) {
    logger.error(`Config load failed: ${configResult.errors.join(", ")}`);
    process.exit(1);
  }

  const configs = configResult.configs;
  logger.info(`Loaded ${configs.length} subsidiary config(s)`);

  const claude = createClaudeClient();

  const authOptions = {
    credentialsPath: process.env.GMAIL_CREDENTIALS_PATH || "./credentials.json",
    tokenPath: process.env.GMAIL_TOKEN_PATH || "./token.json",
  };

  const poller = runPoller({
    db,
    configs,
    claude,
    fetchMessages: (maxResults) => fetchNewMessages(authOptions, maxResults),
    intervalMs: pollInterval,
  });

  const scheduler = runScheduler({
    db,
    configs,
    intervalMs: 60_000,
  });

  logger.info("ServiceBot service running. Press Ctrl+C to stop.");

  process.on("SIGINT", () => {
    logger.info("Shutting down...");
    poller.stop();
    scheduler.stop();
    db.close();
    process.exit(0);
  });

  process.on("SIGTERM", () => {
    poller.stop();
    scheduler.stop();
    db.close();
    process.exit(0);
  });
}

main().catch((err) => {
  logger.error("Fatal error", err);
  process.exit(1);
});
```

**Step 2: Add a start script to service package.json**

In `service/package.json`, add to `"scripts"`:

```json
"start": "tsx src/cli/run.ts"
```

**Step 3: Verify the entry point compiles**

```bash
pnpm --filter @servicebot/service exec tsx --check src/cli/run.ts
```
Expected: no errors (type-check only, no runtime).

**Step 4: Commit**

```bash
git add service/src/cli/run.ts service/package.json
git commit -m "feat(service): add main CLI entry point for background service"
```

---

## Track 2 — Ticket Lifecycle State Machine

### Task 3: Extend TicketStatus type and add DB methods

**Context:** `TicketStatus` in `packages/core/src/db/types.ts` is currently `"open" | "closed"`. We need `"pending"` and `"resolved"` states. The tickets table uses a TEXT column for status (no schema migration needed — SQLite is flexible). We add a dedicated `resolved_at` column (set immutably on transition to "resolved") for accurate SLA metrics, plus `updateTicketStatus` and `getTicketsByStatus` methods on `ServiceBotDatabase`.

**Files:**
- Create: `packages/core/src/db/migrations/003_phase3_lifecycle.sql`
- Modify: `packages/core/src/db/types.ts` (line 2)
- Modify: `packages/core/src/db/database.ts` (add migration + methods after `getOpenTickets`)
- Test: `packages/core/test/db/database.test.ts`

**Step 1: Write the failing tests**

Add to `packages/core/test/db/database.test.ts`, inside the existing describe block:

```typescript
describe("ticket lifecycle", () => {
  let db: ServiceBotDatabase;
  beforeEach(() => {
    db = new ServiceBotDatabase(join(tmpdir(), `test-${randomUUID()}.db`));
    db.saveTicket(makeTicket({ id: "t1", status: "open" }));
  });
  afterEach(() => db.close());

  it("updateTicketStatus changes status and updated_at", () => {
    db.updateTicketStatus("t1", "pending", "2026-03-08T12:00:00Z");
    const ticket = db.getTicket("t1");
    expect(ticket?.status).toBe("pending");
    expect(ticket?.updatedAt).toBe("2026-03-08T12:00:00Z");
  });

  it("updateTicketStatus to resolved records resolved_at immutably", () => {
    db.updateTicketStatus("t1", "resolved", "2026-03-08T13:00:00Z");
    const ticket = db.getTicket("t1");
    expect(ticket?.status).toBe("resolved");
    expect(ticket?.resolvedAt).toBe("2026-03-08T13:00:00Z");
  });

  it("resolved_at is not overwritten by subsequent updates", () => {
    db.updateTicketStatus("t1", "resolved", "2026-03-08T13:00:00Z");
    db.updateTicketStatus("t1", "closed", "2026-03-08T15:00:00Z");
    const ticket = db.getTicket("t1");
    expect(ticket?.status).toBe("closed");
    expect(ticket?.resolvedAt).toBe("2026-03-08T13:00:00Z"); // immutable
  });

  it("updateTicketStatus to closed records timestamp", () => {
    db.updateTicketStatus("t1", "closed", "2026-03-08T14:00:00Z");
    const ticket = db.getTicket("t1");
    expect(ticket?.status).toBe("closed");
  });

  it("getOpenTickets excludes resolved and closed tickets", () => {
    db.saveTicket(makeTicket({ id: "t2", status: "open" }));
    db.updateTicketStatus("t1", "resolved", new Date().toISOString());
    const open = db.getOpenTickets();
    expect(open).toHaveLength(1);
    expect(open[0].id).toBe("t2");
  });

  it("getTicketsByStatus returns filtered list", () => {
    db.saveTicket(makeTicket({ id: "t2", status: "open" }));
    db.updateTicketStatus("t1", "resolved", new Date().toISOString());
    const resolved = db.getTicketsByStatus("resolved");
    expect(resolved).toHaveLength(1);
    expect(resolved[0].id).toBe("t1");
  });
});
```

**Step 2: Run tests to verify they fail**

```bash
pnpm --filter @servicebot/core test -- --reporter verbose database
```
Expected: FAIL — `updateTicketStatus` and `getTicketsByStatus` not defined.

**Step 3: Create lifecycle migration**

Create `packages/core/src/db/migrations/003_phase3_lifecycle.sql`:

```sql
ALTER TABLE tickets ADD COLUMN resolved_at TEXT;
```

**Step 3a: Update TicketStatus type**

In `packages/core/src/db/types.ts`, line 2:

Change:
```typescript
export type TicketStatus = "open" | "closed";
```
To:
```typescript
export type TicketStatus = "open" | "pending" | "resolved" | "closed";
```

Also add `resolvedAt?: string;` to the `Ticket` interface in the same file.

**Step 4: Add migration runner + DB methods**

In `packages/core/src/db/database.ts`, in the `runMigrations` method, after the `002` migration block, add:

```typescript
const applied003 = this.db
  .prepare("SELECT 1 FROM schema_migrations WHERE version = ?")
  .get("003") as { 1: number } | undefined;

if (!applied003) {
  this.db.exec(loadMigrationSQL("003_phase3_lifecycle.sql"));
  this.db.prepare("INSERT INTO schema_migrations (version) VALUES (?)").run("003");
}
```

**Step 4a: Add DB methods**

In `packages/core/src/db/database.ts`, after the `getOpenTickets` method (around line 130):

```typescript
updateTicketStatus(id: string, status: TicketStatus, updatedAt: string): void {
  this.db
    .prepare("UPDATE tickets SET status = ?, updated_at = ? WHERE id = ?")
    .run(status, updatedAt, id);
  // Set resolved_at immutably — only on first transition to "resolved"
  if (status === "resolved") {
    this.db
      .prepare("UPDATE tickets SET resolved_at = ? WHERE id = ? AND resolved_at IS NULL")
      .run(updatedAt, id);
  }
  this.saveAuditEntry({
    entityType: "ticket",
    entityId: id,
    action: "status_changed",
    payloadJson: JSON.stringify({ status, updatedAt }),
  });
}

getTicketsByStatus(status: TicketStatus, subsidiaryId?: string): Ticket[] {
  if (subsidiaryId) {
    const rows = this.db
      .prepare("SELECT * FROM tickets WHERE status = ? AND subsidiary_id = ?")
      .all(status, subsidiaryId) as Record<string, unknown>[];
    return rows.map((r) => this.mapTicket(r));
  }
  const rows = this.db
    .prepare("SELECT * FROM tickets WHERE status = ?")
    .all(status) as Record<string, unknown>[];
  return rows.map((r) => this.mapTicket(r));
}
```

Add the `TicketStatus` import at the top of `database.ts`:

```typescript
import type { Ticket, Task, TaskState, Draft, Contact, AuditEntry, WebhookAttempt, Subsidiary, TicketStatus } from "./types";
```

**Step 5: Export from index**

In `packages/core/src/index.ts`, verify `TicketStatus` is already exported (it is from Phase 2).

**Step 6: Run tests to verify they pass**

```bash
pnpm --filter @servicebot/core test
```
Expected: PASS — all existing + new lifecycle tests green.

**Step 7: Commit**

```bash
git add packages/core/src/db/types.ts packages/core/src/db/database.ts packages/core/test/db/database.test.ts
git commit -m "feat(core): extend TicketStatus with pending/resolved, add updateTicketStatus and getTicketsByStatus"
```

---

### Task 4: Add ticket status update API route

**Context:** The admin dashboard needs an API to change ticket status. Add `PATCH /api/admin/servicebot/tickets/[id]/status` that accepts `{ status, actor }` and calls `db.updateTicketStatus`.

**Files:**
- Create: `src/app/api/admin/servicebot/tickets/[id]/status/route.ts`
- Modify: `src/lib/servicebot/client.ts` (add `updateTicketStatus` client function)

**Step 1: Create the API route**

Create `src/app/api/admin/servicebot/tickets/[id]/status/route.ts`:

```typescript
import { NextRequest } from "next/server";
import { getServiceBotDb } from "@/lib/servicebot/server";
import { jsonOk, jsonError } from "@/lib/servicebot/http";
import type { TicketStatus } from "@servicebot/core";

const VALID_STATUSES: TicketStatus[] = ["open", "pending", "resolved", "closed"];

/**
 * PATCH /api/admin/servicebot/tickets/[id]/status
 *
 * Update a ticket's status.
 * Body: { status: TicketStatus, actor: string }
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { status, actor } = body;

    if (!status || !VALID_STATUSES.includes(status)) {
      return jsonError(`Invalid status. Must be one of: ${VALID_STATUSES.join(", ")}`, 400);
    }
    if (!actor) {
      return jsonError("actor is required", 400);
    }

    const db = getServiceBotDb();
    const ticket = db.getTicket(id);
    if (!ticket) return jsonError("Ticket not found", 404);

    db.updateTicketStatus(id, status, new Date().toISOString());
    return jsonOk({ updated: true, id, status });
  } catch (err) {
    return jsonError(err instanceof Error ? err.message : "Internal error", 500);
  }
}
```

**Step 2: Add client function**

In `src/lib/servicebot/client.ts`, add:

```typescript
export async function updateTicketStatus(id: string, status: string, actor: string) {
  const res = await fetch(`${BASE}/tickets/${id}/status`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status, actor }),
  });
  if (!res.ok) throw new Error(`Failed to update ticket status: ${res.status}`);
  return res.json();
}
```

**Step 3: Lint**

```bash
pnpm lint
```
Expected: no errors.

**Step 4: Commit**

```bash
git add src/app/api/admin/servicebot/tickets/[id]/status/route.ts src/lib/servicebot/client.ts
git commit -m "feat(api): PATCH /api/admin/servicebot/tickets/[id]/status route"
```

---

### Task 5: Add ticket status controls to ticket detail page

**Context:** The ticket detail page (`src/app/admin/servicebot/tickets/[id]/page.tsx`) shows ticket info and drafts but has no way to change status. Add a status dropdown and resolve/close buttons.

**Files:**
- Modify: `src/app/admin/servicebot/tickets/[id]/page.tsx`

**Step 1: Update the ticket detail page**

In `src/app/admin/servicebot/tickets/[id]/page.tsx`, after the status badge span inside the ticket info card, add status action buttons:

Replace the status badge section:
```typescript
<span className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
  {ticket.status}
</span>
```

With:
```typescript
<div className="flex items-center gap-2">
  <span className={`rounded px-2 py-0.5 text-xs ${
    ticket.status === "resolved" ? "bg-green-100 text-green-700" :
    ticket.status === "closed" ? "bg-gray-200 text-gray-500" :
    ticket.status === "pending" ? "bg-blue-100 text-blue-700" :
    "bg-yellow-100 text-yellow-700"
  }`}>
    {ticket.status}
  </span>
  {ticket.status === "open" && (
    <>
      <button
        onClick={() => handleStatusChange("pending")}
        disabled={statusLoading}
        className="rounded bg-blue-600 px-2 py-0.5 text-xs text-white hover:bg-blue-700 disabled:opacity-50"
      >
        Mark Pending
      </button>
      <button
        onClick={() => handleStatusChange("resolved")}
        disabled={statusLoading}
        className="rounded bg-green-600 px-2 py-0.5 text-xs text-white hover:bg-green-700 disabled:opacity-50"
      >
        Resolve
      </button>
    </>
  )}
  {ticket.status === "pending" && (
    <button
      onClick={() => handleStatusChange("resolved")}
      disabled={statusLoading}
      className="rounded bg-green-600 px-2 py-0.5 text-xs text-white hover:bg-green-700 disabled:opacity-50"
    >
      Resolve
    </button>
  )}
  {(ticket.status === "open" || ticket.status === "pending" || ticket.status === "resolved") && (
    <button
      onClick={() => handleStatusChange("closed")}
      disabled={statusLoading}
      className="rounded bg-gray-600 px-2 py-0.5 text-xs text-white hover:bg-gray-700 disabled:opacity-50"
    >
      Close
    </button>
  )}
</div>
```

Add the state and handler at the top of the component (after the existing useState calls):

```typescript
const [statusLoading, setStatusLoading] = useState(false);

const handleStatusChange = async (newStatus: string) => {
  setStatusLoading(true);
  try {
    await updateTicketStatus(id, newStatus, "admin");
    setTicket((prev) => prev ? { ...prev, status: newStatus } : prev);
  } catch (e) {
    setError(e instanceof Error ? e.message : "Failed to update status");
  } finally {
    setStatusLoading(false);
  }
};
```

Add `updateTicketStatus` to the import from `@/lib/servicebot/client`.

**Step 2: Lint**

```bash
pnpm lint
```
Expected: no errors.

**Step 3: Commit**

```bash
git add src/app/admin/servicebot/tickets/[id]/page.tsx
git commit -m "feat(ui): add ticket status controls (pending/resolve/close) to detail page"
```

---

## Track 3 — SMTP Error Recovery

### Task 6: Add send_attempts table and DB methods

**Context:** When `sendApprovedDraft` fails, the error is swallowed by the approve route's catch block. We need a `send_attempts` table to track each send attempt (success or failure) and methods to query failed sends for retry.

**Files:**
- Create: `packages/core/src/db/migrations/004_phase3_send_attempts.sql`
- Modify: `packages/core/src/db/database.ts` (add migration + methods)
- Modify: `packages/core/src/db/types.ts` (add SendAttempt type)
- Test: `packages/core/test/db/database.test.ts`

**Step 1: Write the failing tests**

Add to `packages/core/test/db/database.test.ts`:

```typescript
describe("send_attempts", () => {
  let db: ServiceBotDatabase;
  beforeEach(() => {
    db = new ServiceBotDatabase(join(tmpdir(), `test-${randomUUID()}.db`));
  });
  afterEach(() => db.close());

  it("records a successful send attempt", () => {
    db.insertSendAttempt({
      id: "sa1",
      draftId: "d1",
      ticketId: "t1",
      status: "sent",
      messageId: "msg-123",
      createdAt: "2026-03-08T12:00:00Z",
    });
    const attempts = db.getSendAttempts("d1");
    expect(attempts).toHaveLength(1);
    expect(attempts[0].status).toBe("sent");
  });

  it("records a failed send attempt", () => {
    db.insertSendAttempt({
      id: "sa2",
      draftId: "d1",
      ticketId: "t1",
      status: "failed",
      errorMessage: "Connection refused",
      createdAt: "2026-03-08T12:00:00Z",
    });
    const attempts = db.getSendAttempts("d1");
    expect(attempts).toHaveLength(1);
    expect(attempts[0].status).toBe("failed");
    expect(attempts[0].errorMessage).toBe("Connection refused");
  });

  it("getFailedSendAttempts returns only failed attempts", () => {
    db.insertSendAttempt({ id: "sa1", draftId: "d1", ticketId: "t1", status: "sent", createdAt: "2026-03-08T12:00:00Z" });
    db.insertSendAttempt({ id: "sa2", draftId: "d2", ticketId: "t1", status: "failed", errorMessage: "timeout", createdAt: "2026-03-08T12:01:00Z" });
    const failed = db.getFailedSendAttempts();
    expect(failed).toHaveLength(1);
    expect(failed[0].draftId).toBe("d2");
  });
});
```

**Step 2: Run tests to verify they fail**

```bash
pnpm --filter @servicebot/core test -- --reporter verbose database
```
Expected: FAIL — methods not defined.

**Step 3: Create migration**

Create `packages/core/src/db/migrations/004_phase3_send_attempts.sql`:

```sql
CREATE TABLE IF NOT EXISTS send_attempts (
  id TEXT PRIMARY KEY,
  draft_id TEXT NOT NULL REFERENCES drafts(id),
  ticket_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  message_id TEXT,
  error_message TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

**Step 4: Add SendAttempt type**

In `packages/core/src/db/types.ts`, add at the end:

```typescript
export interface SendAttempt {
  id: string;
  draftId: string;
  ticketId: string;
  status: string;
  messageId?: string;
  errorMessage?: string;
  createdAt: string;
}
```

**Step 5: Add migration runner + DB methods**

In `packages/core/src/db/database.ts`, in the `runMigrations` method, after the `002` migration block, add:

```typescript
const applied004 = this.db
  .prepare("SELECT 1 FROM schema_migrations WHERE version = ?")
  .get("004") as { 1: number } | undefined;

if (!applied004) {
  this.db.exec(loadMigrationSQL("004_phase3_send_attempts.sql"));
  this.db.prepare("INSERT INTO schema_migrations (version) VALUES (?)").run("004");
}
```

Add methods after the `// ── Subsidiaries` section:

```typescript
// ── Send Attempts ──────────────────────────────────────────────

insertSendAttempt(a: { id: string; draftId: string; ticketId: string; status: string; messageId?: string; errorMessage?: string; createdAt: string }): void {
  this.db
    .prepare(
      `INSERT INTO send_attempts (id, draft_id, ticket_id, status, message_id, error_message, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(a.id, a.draftId, a.ticketId, a.status, a.messageId ?? null, a.errorMessage ?? null, a.createdAt);
}

getSendAttempts(draftId: string): { id: string; draftId: string; ticketId: string; status: string; messageId?: string; errorMessage?: string; createdAt: string }[] {
  const rows = this.db
    .prepare("SELECT * FROM send_attempts WHERE draft_id = ? ORDER BY created_at DESC")
    .all(draftId) as Record<string, unknown>[];
  return rows.map((r) => ({
    id: r.id as string,
    draftId: r.draft_id as string,
    ticketId: r.ticket_id as string,
    status: r.status as string,
    messageId: (r.message_id as string) ?? undefined,
    errorMessage: (r.error_message as string) ?? undefined,
    createdAt: r.created_at as string,
  }));
}

getFailedSendAttempts(): { id: string; draftId: string; ticketId: string; status: string; errorMessage?: string; createdAt: string }[] {
  const rows = this.db
    .prepare("SELECT * FROM send_attempts WHERE status = 'failed' ORDER BY created_at DESC")
    .all() as Record<string, unknown>[];
  return rows.map((r) => ({
    id: r.id as string,
    draftId: r.draft_id as string,
    ticketId: r.ticket_id as string,
    status: r.status as string,
    errorMessage: (r.error_message as string) ?? undefined,
    createdAt: r.created_at as string,
  }));
}
```

**Step 6: Export from index**

In `packages/core/src/index.ts`, add `SendAttempt` to the types export line.

**Step 7: Run tests to verify they pass**

```bash
pnpm --filter @servicebot/core test
```
Expected: PASS.

**Step 8: Commit**

```bash
git add packages/core/src/db/migrations/004_phase3_send_attempts.sql packages/core/src/db/types.ts packages/core/src/db/database.ts packages/core/src/index.ts packages/core/test/db/database.test.ts
git commit -m "feat(core): add send_attempts table and DB methods for SMTP error tracking"
```

---

### Task 7: Update approve route to record send attempts

**Context:** The approve route (`src/app/api/admin/servicebot/drafts/[id]/approve/route.ts`) currently calls `sendApprovedDraft` and returns the result, but if it throws, the error goes to the generic catch. We need to wrap the send call, record success/failure in `send_attempts`, and return meaningful status.

**Files:**
- Modify: `src/app/api/admin/servicebot/drafts/[id]/approve/route.ts`

**Step 1: Update the approve route**

Replace the SMTP send block (from `if (smtpConfig && ticket)` to the `return jsonOk` after it) with:

```typescript
if (smtpConfig && ticket) {
  const mailer = getMailer();
  try {
    const result = await sendApprovedDraft({
      draftId: id,
      db,
      mailer,
      smtpConfig,
      ticketEmail: ticket.customerEmail,
      now: () => new Date().toISOString(),
    });
    db.insertSendAttempt({
      id: randomUUID(),
      draftId: id,
      ticketId: draft.ticketId,
      status: "sent",
      messageId: result.messageId,
      createdAt: new Date().toISOString(),
    });
    return jsonOk({ approved: true, ...result });
  } catch (sendErr) {
    db.insertSendAttempt({
      id: randomUUID(),
      draftId: id,
      ticketId: draft.ticketId,
      status: "failed",
      errorMessage: sendErr instanceof Error ? sendErr.message : "Unknown SMTP error",
      createdAt: new Date().toISOString(),
    });
    return jsonOk({
      approved: true,
      sent: false,
      sendError: sendErr instanceof Error ? sendErr.message : "SMTP send failed",
    });
  }
}
```

Add `import { randomUUID } from "node:crypto";` at the top.

**Step 2: Lint**

```bash
pnpm lint
```

**Step 3: Commit**

```bash
git add src/app/api/admin/servicebot/drafts/[id]/approve/route.ts
git commit -m "feat(api): record send attempts on draft approval, surface SMTP errors"
```

---

### Task 8: Add retry send API route and failed sends dashboard

**Context:** Admins need to see failed sends and retry them. Add `POST /api/admin/servicebot/drafts/[id]/retry-send` that re-attempts the send, and `GET /api/admin/servicebot/send-failures` that lists all failed attempts.

**Files:**
- Create: `src/app/api/admin/servicebot/drafts/[id]/retry-send/route.ts`
- Create: `src/app/api/admin/servicebot/send-failures/route.ts`
- Modify: `src/lib/servicebot/client.ts` (add client functions)

**Step 1: Create the send failures list route**

Create `src/app/api/admin/servicebot/send-failures/route.ts`:

```typescript
import { getServiceBotDb } from "@/lib/servicebot/server";
import { jsonOk, jsonError } from "@/lib/servicebot/http";

/**
 * GET /api/admin/servicebot/send-failures
 *
 * List all failed send attempts.
 */
export async function GET() {
  try {
    const db = getServiceBotDb();
    const failures = db.getFailedSendAttempts();
    return jsonOk({ failures });
  } catch (err) {
    return jsonError(err instanceof Error ? err.message : "Internal error", 500);
  }
}
```

**Step 2: Create the retry send route**

Create `src/app/api/admin/servicebot/drafts/[id]/retry-send/route.ts`:

```typescript
import { NextRequest } from "next/server";
import { randomUUID } from "node:crypto";
import { getServiceBotDb, getMailer, getSubsidiarySmtpConfig } from "@/lib/servicebot/server";
import { sendApprovedDraft } from "@servicebot/core";
import { jsonOk, jsonError } from "@/lib/servicebot/http";

/**
 * POST /api/admin/servicebot/drafts/[id]/retry-send
 *
 * Retry sending an approved draft that previously failed.
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const db = getServiceBotDb();

    const draft = db.getDraft(id);
    if (!draft) return jsonError("Draft not found", 404);
    if (!draft.approved) return jsonError("Draft not approved", 400);

    const ticket = db.getTicket(draft.ticketId);
    if (!ticket) return jsonError("Ticket not found", 404);

    const smtpConfig = getSubsidiarySmtpConfig(ticket.subsidiaryId);
    if (!smtpConfig) return jsonError("No SMTP config for subsidiary", 400);

    const mailer = getMailer();
    try {
      const result = await sendApprovedDraft({
        draftId: id,
        db,
        mailer,
        smtpConfig,
        ticketEmail: ticket.customerEmail,
        now: () => new Date().toISOString(),
      });
      db.insertSendAttempt({
        id: randomUUID(),
        draftId: id,
        ticketId: draft.ticketId,
        status: "sent",
        messageId: result.messageId,
        createdAt: new Date().toISOString(),
      });
      return jsonOk({ retried: true, ...result });
    } catch (sendErr) {
      db.insertSendAttempt({
        id: randomUUID(),
        draftId: id,
        ticketId: draft.ticketId,
        status: "failed",
        errorMessage: sendErr instanceof Error ? sendErr.message : "Unknown SMTP error",
        createdAt: new Date().toISOString(),
      });
      return jsonOk({
        retried: true,
        sent: false,
        sendError: sendErr instanceof Error ? sendErr.message : "SMTP retry failed",
      });
    }
  } catch (err) {
    return jsonError(err instanceof Error ? err.message : "Internal error", 500);
  }
}
```

**Step 3: Add client functions**

In `src/lib/servicebot/client.ts`, add:

```typescript
export async function fetchSendFailures() {
  const res = await fetch(`${BASE}/send-failures`);
  if (!res.ok) throw new Error(`Failed to fetch send failures: ${res.status}`);
  return res.json() as Promise<{ failures: { id: string; draftId: string; ticketId: string; errorMessage?: string; createdAt: string }[] }>;
}

export async function retrySend(draftId: string) {
  const res = await fetch(`${BASE}/drafts/${draftId}/retry-send`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });
  if (!res.ok) throw new Error(`Failed to retry send: ${res.status}`);
  return res.json();
}
```

**Step 4: Lint**

```bash
pnpm lint
```

**Step 5: Commit**

```bash
git add src/app/api/admin/servicebot/send-failures/route.ts src/app/api/admin/servicebot/drafts/[id]/retry-send/route.ts src/lib/servicebot/client.ts
git commit -m "feat(api): add send-failures list and retry-send endpoints"
```

---

### Task 9: Add failed sends section to dashboard

**Context:** The dashboard landing page needs a failed sends indicator, and the DraftsQueue should show send failure status with a retry button.

**Files:**
- Modify: `src/app/admin/servicebot/page.tsx` (add failed sends card)
- Modify: `src/app/admin/servicebot/components/DraftsQueue.tsx` (add retry button for failed sends)

**Step 1: Update dashboard to show failed sends count**

The dashboard (`src/app/admin/servicebot/page.tsx`) is currently a server component. Convert to client component and add a failed sends indicator card.

Replace the content of `src/app/admin/servicebot/page.tsx`:

```typescript
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { fetchSendFailures } from "@/lib/servicebot/client";

const smtpLive = process.env.NEXT_PUBLIC_SMTP_LIVE === "true";

export default function ServiceBotDashboard() {
  const [failureCount, setFailureCount] = useState(0);

  useEffect(() => {
    fetchSendFailures()
      .then((d) => setFailureCount(d.failures.length))
      .catch(() => {});
  }, []);

  return (
    <main className="mx-auto max-w-4xl p-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">ServiceBot Admin</h1>
        <div className="flex items-center gap-2">
          <span
            className={`rounded px-3 py-1 text-xs font-medium ${
              smtpLive
                ? "bg-green-100 text-green-700"
                : "bg-yellow-100 text-yellow-700"
            }`}
          >
            SMTP: {smtpLive ? "LIVE" : "DRY-RUN"}
          </span>
          {failureCount > 0 && (
            <span className="rounded bg-red-100 px-3 py-1 text-xs font-medium text-red-700">
              {failureCount} failed send{failureCount !== 1 ? "s" : ""}
            </span>
          )}
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Link href="/admin/servicebot/tickets" className="rounded-lg border p-6 hover:bg-gray-50">
          <h2 className="font-semibold">Tickets</h2>
          <p className="text-sm text-gray-500">View open customer tickets</p>
        </Link>
        <Link href="/admin/servicebot/tasks" className="rounded-lg border p-6 hover:bg-gray-50">
          <h2 className="font-semibold">Tasks</h2>
          <p className="text-sm text-gray-500">Track task progress</p>
        </Link>
        <Link href="/admin/servicebot/drafts" className="rounded-lg border p-6 hover:bg-gray-50">
          <h2 className="font-semibold">Drafts</h2>
          <p className="text-sm text-gray-500">Review and approve draft responses</p>
        </Link>
      </div>
    </main>
  );
}
```

**Step 2: Add retry button to DraftsQueue**

In `src/app/admin/servicebot/components/DraftsQueue.tsx`, add a retry button for drafts that are approved but have a `sentAt` of undefined (send may have failed). Import `retrySend` from client. After the `ApprovalActions` block, add:

```typescript
{d.approved && !d.sentAt && (
  <button
    onClick={async () => {
      await retrySend(d.id);
      reload();
    }}
    className="mt-2 rounded bg-orange-600 px-3 py-1 text-xs text-white hover:bg-orange-700"
  >
    Retry Send
  </button>
)}
```

Add `retrySend` to the import from `@/lib/servicebot/client`.

**Step 3: Lint**

```bash
pnpm lint
```

**Step 4: Commit**

```bash
git add src/app/admin/servicebot/page.tsx src/app/admin/servicebot/components/DraftsQueue.tsx
git commit -m "feat(ui): failed sends indicator on dashboard, retry button on drafts"
```

---

## Track 4 — Resolution Timestamps & SLA Reporting

### Task 10: Add resolution metrics API route

**Context:** When a ticket transitions to `resolved`, the `updated_at` timestamp records the resolution time. The `created_at` is the intake time. The difference is the resolution duration. Add a simple metrics route that returns: total tickets, open/pending/resolved/closed counts, and average resolution time.

**Files:**
- Create: `src/app/api/admin/servicebot/metrics/route.ts`
- Modify: `src/lib/servicebot/client.ts`
- Modify: `packages/core/src/db/database.ts` (add `getTicketMetrics` method)

**Step 1: Add DB method for metrics**

In `packages/core/src/db/database.ts`, after `getTicketsByStatus`:

```typescript
getTicketMetrics(): { total: number; open: number; pending: number; resolved: number; closed: number; avgResolutionMs: number | null } {
  const counts = this.db
    .prepare(
      `SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status = 'open' THEN 1 ELSE 0 END) as open,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN status = 'resolved' THEN 1 ELSE 0 END) as resolved,
        SUM(CASE WHEN status = 'closed' THEN 1 ELSE 0 END) as closed
      FROM tickets`,
    )
    .get() as Record<string, number>;

  const avgRow = this.db
    .prepare(
      `SELECT AVG(
        (julianday(resolved_at) - julianday(created_at)) * 86400000
      ) as avg_ms
      FROM tickets
      WHERE resolved_at IS NOT NULL`,
    )
    .get() as { avg_ms: number | null } | undefined;

  return {
    total: counts.total ?? 0,
    open: counts.open ?? 0,
    pending: counts.pending ?? 0,
    resolved: counts.resolved ?? 0,
    closed: counts.closed ?? 0,
    avgResolutionMs: avgRow?.avg_ms ?? null,
  };
}
```

**Step 2: Write the test**

Add to `packages/core/test/db/database.test.ts`:

```typescript
describe("ticket metrics", () => {
  let db: ServiceBotDatabase;
  beforeEach(() => {
    db = new ServiceBotDatabase(join(tmpdir(), `test-${randomUUID()}.db`));
  });
  afterEach(() => db.close());

  it("returns zero counts for empty DB", () => {
    const m = db.getTicketMetrics();
    expect(m.total).toBe(0);
    expect(m.avgResolutionMs).toBeNull();
  });

  it("returns correct counts and avg resolution", () => {
    db.saveTicket(makeTicket({ id: "t1", status: "open", createdAt: "2026-03-08T10:00:00Z", updatedAt: "2026-03-08T10:00:00Z" }));
    db.saveTicket(makeTicket({ id: "t2", status: "open", createdAt: "2026-03-08T10:00:00Z", updatedAt: "2026-03-08T10:00:00Z" }));
    db.updateTicketStatus("t2", "resolved", "2026-03-08T12:00:00Z");
    const m = db.getTicketMetrics();
    expect(m.total).toBe(2);
    expect(m.open).toBe(1);
    expect(m.resolved).toBe(1);
    expect(m.avgResolutionMs).toBeGreaterThan(0);
  });
});
```

**Step 3: Run tests**

```bash
pnpm --filter @servicebot/core test
```
Expected: PASS.

**Step 4: Create metrics API route**

Create `src/app/api/admin/servicebot/metrics/route.ts`:

```typescript
import { getServiceBotDb } from "@/lib/servicebot/server";
import { jsonOk, jsonError } from "@/lib/servicebot/http";

/**
 * GET /api/admin/servicebot/metrics
 *
 * Return ticket metrics: counts by status and average resolution time.
 */
export async function GET() {
  try {
    const db = getServiceBotDb();
    const metrics = db.getTicketMetrics();

    const avgHours = metrics.avgResolutionMs
      ? Math.round(metrics.avgResolutionMs / 3600000 * 10) / 10
      : null;

    return jsonOk({
      metrics: {
        ...metrics,
        avgResolutionHours: avgHours,
      },
    });
  } catch (err) {
    return jsonError(err instanceof Error ? err.message : "Internal error", 500);
  }
}
```

**Step 5: Add client function**

In `src/lib/servicebot/client.ts`:

```typescript
export async function fetchMetrics() {
  const res = await fetch(`${BASE}/metrics`);
  if (!res.ok) throw new Error(`Failed to fetch metrics: ${res.status}`);
  return res.json();
}
```

**Step 6: Commit**

```bash
git add packages/core/src/db/database.ts packages/core/test/db/database.test.ts src/app/api/admin/servicebot/metrics/route.ts src/lib/servicebot/client.ts
git commit -m "feat(metrics): ticket metrics API with resolution time tracking"
```

---

## Track 5 — Field-Optimized Mobile Technician UX

### Task 11: Create field technician page

**Context:** Field technicians need a simplified, mobile-optimized view of their tickets. Large tap targets, high contrast, minimal chrome. The page shows open/pending tickets with one-tap resolve/close. Uses the same API as the admin dashboard but with a field-first layout.

**Files:**
- Modify: `src/app/api/admin/servicebot/tickets/route.ts` (add `?status=` query param filter)
- Modify: `src/lib/servicebot/client.ts` (add `fetchTicketsByStatus` helper)
- Create: `src/app/admin/servicebot/field/page.tsx`

**Step 1: Add server-side status filter to tickets API**

In `src/app/api/admin/servicebot/tickets/route.ts`, update the GET handler to accept an optional `status` query param:

```typescript
export async function GET(request: NextRequest) {
  try {
    const db = getServiceBotDb();
    const statusParam = request.nextUrl.searchParams.get("status");

    let tickets;
    if (statusParam) {
      const statuses = statusParam.split(",");
      tickets = statuses.flatMap((s) => db.getTicketsByStatus(s as TicketStatus));
    } else {
      tickets = db.getOpenTickets();
    }

    return jsonOk({ tickets });
  } catch (err) {
    return jsonError(err instanceof Error ? err.message : "Internal error", 500);
  }
}
```

Add `import type { TicketStatus } from "@servicebot/core";` and `import { NextRequest } from "next/server";` at the top.

**Step 1a: Add client helper**

In `src/lib/servicebot/client.ts`:

```typescript
export async function fetchTicketsByStatus(statuses: string[]) {
  const res = await fetch(`${BASE}/tickets?status=${statuses.join(",")}`);
  if (!res.ok) throw new Error(`Failed to fetch tickets: ${res.status}`);
  return res.json();
}
```

**Step 2: Create the field page**

Create `src/app/admin/servicebot/field/page.tsx`:

```typescript
"use client";

import { useEffect, useState, useCallback } from "react";
import { fetchTicketsByStatus, updateTicketStatus } from "@/lib/servicebot/client";

interface Ticket {
  id: string;
  subsidiaryId: string;
  subject: string;
  customerEmail: string;
  customerName: string;
  status: string;
  createdAt: string;
}

export default function FieldView() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);

  const reload = useCallback(() => {
    setLoading(true);
    fetchTicketsByStatus(["open", "pending", "resolved"])
      .then((data: { tickets: Ticket[] }) => setTickets(data.tickets))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { reload(); }, [reload]);

  const handleAction = async (id: string, status: string) => {
    setActionId(id);
    try {
      await updateTicketStatus(id, status, "field-tech");
      reload();
    } finally {
      setActionId(null);
    }
  };

  return (
    <main className="min-h-screen bg-gray-900 p-4 text-white">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-bold tracking-tight">ServiceBot Field</h1>
        <button
          onClick={reload}
          disabled={loading}
          className="rounded-lg bg-gray-700 px-4 py-2 text-sm font-medium active:bg-gray-600"
        >
          Refresh
        </button>
      </div>

      {loading ? (
        <p className="text-center text-gray-400">Loading...</p>
      ) : tickets.length === 0 ? (
        <div className="mt-20 text-center">
          <p className="text-2xl font-bold text-green-400">All clear</p>
          <p className="mt-2 text-gray-400">No open tickets</p>
        </div>
      ) : (
        <div className="space-y-3">
          {tickets.map((t) => (
            <div
              key={t.id}
              className="rounded-xl border border-gray-700 bg-gray-800 p-4"
            >
              <div className="mb-2 flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-base font-semibold">{t.subject}</p>
                  <p className="mt-1 text-sm text-gray-400">
                    {t.customerName || t.customerEmail}
                  </p>
                </div>
                <span
                  className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${
                    t.status === "pending"
                      ? "bg-blue-900 text-blue-300"
                      : t.status === "resolved"
                        ? "bg-green-900 text-green-300"
                        : "bg-yellow-900 text-yellow-300"
                  }`}
                >
                  {t.status.toUpperCase()}
                </span>
              </div>

              <div className="mt-3 flex gap-2">
                {t.status === "open" && (
                  <button
                    onClick={() => handleAction(t.id, "pending")}
                    disabled={actionId === t.id}
                    className="flex-1 rounded-lg bg-blue-700 py-3 text-center text-sm font-bold active:bg-blue-600 disabled:opacity-50"
                  >
                    IN PROGRESS
                  </button>
                )}
                {(t.status === "open" || t.status === "pending") && (
                  <button
                    onClick={() => handleAction(t.id, "resolved")}
                    disabled={actionId === t.id}
                    className="flex-1 rounded-lg bg-green-700 py-3 text-center text-sm font-bold active:bg-green-600 disabled:opacity-50"
                  >
                    RESOLVE
                  </button>
                )}
                {t.status !== "closed" && (
                  <button
                    onClick={() => handleAction(t.id, "closed")}
                    disabled={actionId === t.id}
                    className="rounded-lg bg-gray-600 px-4 py-3 text-center text-sm font-bold active:bg-gray-500 disabled:opacity-50"
                  >
                    CLOSE
                  </button>
                )}
              </div>

              <p className="mt-2 text-right text-xs text-gray-500">
                {t.createdAt.slice(0, 16).replace("T", " ")}
              </p>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
```

**Step 2: Add field view link to dashboard**

In `src/app/admin/servicebot/page.tsx`, add a fourth card in the grid after the Drafts card:

```typescript
<Link href="/admin/servicebot/field" className="rounded-lg border border-dashed border-gray-400 p-6 hover:bg-gray-50">
  <h2 className="font-semibold">Field View</h2>
  <p className="text-sm text-gray-500">Mobile-optimized for technicians</p>
</Link>
```

Change the grid from `md:grid-cols-3` to `md:grid-cols-2 lg:grid-cols-4`.

**Step 3: Lint**

```bash
pnpm lint
```

**Step 4: Commit**

```bash
git add src/app/admin/servicebot/field/page.tsx src/app/admin/servicebot/page.tsx
git commit -m "feat(ui): field-optimized mobile technician view with large tap targets"
```

---

### Task 12: Add metrics summary to dashboard

**Context:** The dashboard should show a quick metrics bar — total tickets, open count, avg resolution time. This closes the SLA visibility gap.

**Files:**
- Modify: `src/app/admin/servicebot/page.tsx`

**Step 1: Add metrics display**

In `src/app/admin/servicebot/page.tsx`, add a metrics state and fetch alongside the existing `failureCount`:

```typescript
const [metrics, setMetrics] = useState<{ total: number; open: number; pending: number; resolved: number; avgResolutionHours: number | null } | null>(null);

useEffect(() => {
  fetchMetrics()
    .then((d) => setMetrics(d.metrics))
    .catch(() => {});
}, []);
```

Add `fetchMetrics` to the imports from `@/lib/servicebot/client`.

After the header div and before the grid, add:

```typescript
{metrics && (
  <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
    <div className="rounded-lg border p-3 text-center">
      <p className="text-2xl font-bold">{metrics.open + (metrics.pending ?? 0)}</p>
      <p className="text-xs text-gray-500">Active</p>
    </div>
    <div className="rounded-lg border p-3 text-center">
      <p className="text-2xl font-bold">{metrics.resolved}</p>
      <p className="text-xs text-gray-500">Resolved</p>
    </div>
    <div className="rounded-lg border p-3 text-center">
      <p className="text-2xl font-bold">{metrics.total}</p>
      <p className="text-xs text-gray-500">Total</p>
    </div>
    <div className="rounded-lg border p-3 text-center">
      <p className="text-2xl font-bold">{metrics.avgResolutionHours ?? "—"}</p>
      <p className="text-xs text-gray-500">Avg Hours to Resolve</p>
    </div>
  </div>
)}
```

**Step 2: Lint**

```bash
pnpm lint
```

**Step 3: Commit**

```bash
git add src/app/admin/servicebot/page.tsx
git commit -m "feat(ui): metrics summary bar on dashboard (active, resolved, avg resolution time)"
```

---

## Final: Full test suite + lint

**Step 1: Run everything**

```bash
cd "C:/Users/Jay/OneDrive/Desktop/Alamo-Crafting-Forge"
pnpm --filter @servicebot/core test
pnpm test
pnpm lint
```
Expected: all passing, no lint errors.

**Step 2: Commit if any stray files**

```bash
git status
```

---

## Environment Variables Reference

| Var | Default | Purpose |
|-|-|-|
| `SERVICEBOT_DB_PATH` | `./servicebot.db` | SQLite DB path |
| `POLL_INTERVAL_MS` | `120000` | Email polling interval (ms) |
| `SERVICEBOT_CONFIG_DIR` | `./subsidiaries` | Directory for subsidiary config files |
| `GMAIL_CREDENTIALS_PATH` | `./credentials.json` | OAuth2 credentials file |
| `GMAIL_TOKEN_PATH` | `./token.json` | OAuth2 token file |
| `SMTP_LIVE` | `false` | Set to `true` for real email |
| `SMTP_TEST_RECIPIENT` | `restojay01@gmail.com` | Dry-run redirect target |
| `NEXT_PUBLIC_SMTP_LIVE` | `false` | Client-side SMTP mode indicator |
| `ADMIN_SECRET` | — | Admin auth password |

## Approved Scope (Council 2026-03-08)

- Task 1-2: Background email polling runner + CLI entry point
- Task 3-5: Ticket lifecycle state machine (open→pending→resolved→closed) + API + UI controls
- Task 6-9: SMTP error recovery (send_attempts table, retry API, failed sends UI)
- Task 10: Resolution metrics API with avg resolution time
- Task 11-12: Field-optimized mobile technician view + dashboard metrics bar

**Out of scope for this plan:** Gmail Pub/Sub push, multimodal attachment processing, Redis/Postgres migration, SMS notifications, per-subsidiary field views.
