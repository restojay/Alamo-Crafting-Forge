# ServiceBot Phase 2 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add admin dashboard, SMTP outbound, multi-client onboarding, webhook dispatch, and observability to the ServiceBot engine.

**Architecture:** Keep business logic in packages/core, expose thin API adapters in Next.js, keep UI strictly read/actuate. No event bus (YAGNI). Single-node SQLite with WAL. All outbound actions require human approval.

**Tech Stack:** TypeScript, Next.js 15, SQLite (better-sqlite3), nodemailer, pino, Zod

**Phase 1 baseline:** 45 files, 125 tests, 3 pnpm workspaces (packages/core, service, subsidiaries)

---

## Task 1 — Extend Config + Domain for SMTP/Webhooks

**Files**
- Create: `packages/core/src/notifications/types.ts`
- Modify: `packages/core/src/config/types.ts`
- Modify: `packages/core/src/config/schema.ts`
- Modify: `packages/core/src/db/types.ts`
- Test: `packages/core/test/config/schema-smtp-webhooks.test.ts`

**Step 1: Write failing tests for SMTP and webhook config validation**

```ts
import { describe, it, expect } from "vitest";
import { validateConfig } from "../../src/config/schema.js";

describe("SMTP + Webhook config validation", () => {
  const base = {
    id: "test-client",
    name: "Test Client",
    sector: "Services",
    email: { inbound: "info@test.com", smtp: "smtp.gmail.com", credentialKey: "TEST", pollIntervalMinutes: 5 },
    agent: { businessContext: "Test", tone: "Professional", faq: [], services: ["Service A"] },
    operations: { businessHours: "Mon-Fri 9-5", escalationContact: "admin@test.com" },
    tasks: { recurring: [], categories: ["general"] },
  };

  it("accepts valid SMTP config", () => {
    const result = validateConfig({
      ...base,
      smtp: { host: "smtp.sendgrid.net", port: 587, secure: false, username: "u", passwordEnv: "SMTP_PASS", fromEmail: "ops@acf.com" },
    });
    expect(result.valid).toBe(true);
  });

  it("rejects SMTP config missing host", () => {
    const result = validateConfig({
      ...base,
      smtp: { port: 587, secure: false, username: "u", passwordEnv: "SMTP_PASS", fromEmail: "ops@acf.com" },
    });
    expect(result.valid).toBe(false);
  });

  it("accepts valid webhooks array", () => {
    const result = validateConfig({
      ...base,
      webhooks: [{ event: "task.completed", url: "https://example.com/hook" }],
    });
    expect(result.valid).toBe(true);
  });

  it("rejects webhook with invalid event type", () => {
    const result = validateConfig({
      ...base,
      webhooks: [{ event: "invalid.event", url: "https://example.com/hook" }],
    });
    expect(result.valid).toBe(false);
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `pnpm --filter @servicebot/core test`
Expected: FAIL — SMTP and webhook fields not in schema

**Step 3: Extend SubsidiaryConfig and Zod schema**

Add to `packages/core/src/config/types.ts`:
```ts
smtp?: {
  host: string;
  port: number;
  secure: boolean;
  username: string;
  passwordEnv: string;
  fromEmail: string;
  fromName?: string;
};
webhooks?: Array<{
  event: "task.completed" | "booking.created";
  url: string;
  secretEnv?: string;
  timeoutMs?: number;
}>;
```

Create `packages/core/src/notifications/types.ts`:
```ts
export type WebhookEvent = "task.completed" | "booking.created";
```

Update Zod schema in `packages/core/src/config/schema.ts` with matching validators. `timeoutMs` default 5000, max 15000.

**Step 4: Run tests to verify they pass**

Run: `pnpm --filter @servicebot/core test`
Expected: PASS

**Step 5: Commit**

```bash
git add packages/core/src/config/ packages/core/src/notifications/ packages/core/test/config/
git commit -m "feat(core): add smtp and webhook config contracts with zod validation"
```

---

## Task 2 — DB Migration for Draft Send Tracking + Webhook Attempts

**Files**
- Create: `packages/core/src/db/migrations/002_phase2_outbound_webhooks.sql`
- Modify: `packages/core/src/db/database.ts`
- Modify: `packages/core/src/db/types.ts`
- Test: `packages/core/test/db/database-outbound.test.ts`

**Step 1: Write failing tests for new DB methods**

```ts
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { ServiceBotDatabase } from "../../src/db/database.js";

describe("Phase 2 DB methods", () => {
  let db: ServiceBotDatabase;

  beforeEach(() => { db = new ServiceBotDatabase(":memory:"); });
  afterEach(() => { db.close(); });

  it("markDraftApproved sets approved fields", () => {
    // setup: save ticket + draft
    // act: markDraftApproved(id, "admin", "2026-03-02T12:00:00Z")
    // assert: draft has approved = 1, approved_by, approved_at
  });

  it("markDraftSent sets sent_at", () => {
    // act: markDraftSent(id, "2026-03-02T12:01:00Z", "msg-123")
    // assert: draft has sent_at set
  });

  it("insertWebhookAttempt persists attempt", () => {
    // act: insertWebhookAttempt(...)
    // assert: row exists with correct fields
  });

  it("listPendingWebhookRetries returns due retries", () => {
    // setup: insert attempt with next_retry_at in the past
    // assert: returned in pending list
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `pnpm --filter @servicebot/core test`
Expected: FAIL — methods don't exist

**Step 3: Create migration SQL**

Create `packages/core/src/db/migrations/002_phase2_outbound_webhooks.sql`:
```sql
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
```

**Step 4: Add DB methods and update types**

Add to `database.ts`: `markDraftApproved`, `markDraftRejected`, `markDraftSent`, `insertWebhookAttempt`, `listPendingWebhookRetries`. Update `Draft` type in `types.ts` with new optional fields.

Update `runMigrations()` to also load `002_phase2_outbound_webhooks.sql`.

**Step 5: Run tests to verify they pass**

Run: `pnpm --filter @servicebot/core test`
Expected: PASS

**Step 6: Commit**

```bash
git add packages/core/src/db/ packages/core/test/db/
git commit -m "feat(core-db): add outbound draft status fields and webhook_attempts persistence"
```

---

## Task 3 — SMTP Outbound Service (Approval-Gated)

**Files**
- Create: `packages/core/src/email/smtp/mailer.ts`
- Create: `packages/core/src/email/smtp/sender.ts`
- Test: `packages/core/test/email/smtp/mailer.test.ts`
- Test: `packages/core/test/email/smtp/sender.test.ts`

**Step 1: Write failing mailer tests**

```ts
describe("OutboundMailer", () => {
  it("sends email using subsidiary SMTP config", async () => {
    const transport = { sendMail: vi.fn().mockResolvedValue({ messageId: "msg-1" }) };
    const mailer = createMailer(() => transport as any);
    const result = await mailer.send({
      to: "customer@test.com",
      subject: "Re: Your request",
      text: "Thank you for reaching out.",
      smtp: { host: "smtp.test.com", port: 587, secure: false, username: "u", passwordEnv: "PASS", fromEmail: "ops@acf.com" },
    });
    expect(result.messageId).toBe("msg-1");
  });

  it("throws if SMTP config is missing", async () => {
    const mailer = createMailer(() => { throw new Error("no transport"); });
    await expect(mailer.send({ to: "a@b.com", subject: "x", text: "y", smtp: undefined as any }))
      .rejects.toThrow();
  });
});
```

**Step 2: Run tests — expect FAIL**

**Step 3: Implement OutboundMailer interface + createMailer**

```ts
export interface OutboundMailer {
  send(input: {
    to: string;
    subject: string;
    text: string;
    html?: string;
    smtp: NonNullable<SubsidiaryConfig["smtp"]>;
  }): Promise<{ messageId: string }>;
}
```

**Step 4: Write failing sender integration tests**

Test `sendApprovedDraft(draftId, actor)`:
- approve draft -> send email -> set sent_at
- send failure -> keep approved but unsent, audit error
- idempotency: already sent_at -> return no-op

**Step 5: Implement sender**

**Step 6: Run all tests — expect PASS**

**Step 7: Commit**

```bash
git add packages/core/src/email/smtp/ packages/core/test/email/smtp/
git commit -m "feat(outbound): add smtp sender for approved drafts with audit trail and idempotency"
```

---

## Task 4 — Admin API Surface (Next.js Route Handlers)

**Files**
- Create: `src/app/api/admin/servicebot/tickets/route.ts`
- Create: `src/app/api/admin/servicebot/tasks/route.ts`
- Create: `src/app/api/admin/servicebot/drafts/route.ts`
- Create: `src/app/api/admin/servicebot/drafts/[id]/approve/route.ts`
- Create: `src/app/api/admin/servicebot/drafts/[id]/reject/route.ts`
- Create: `src/lib/servicebot/server.ts`
- Create: `src/lib/servicebot/http.ts`
- Test: `src/app/api/admin/servicebot/__tests__/tickets.route.test.ts`
- Test: `src/app/api/admin/servicebot/__tests__/draft-approve.route.test.ts`

**Step 1: Write failing route tests for list endpoints and approve/reject**

**Step 2: Run tests — expect FAIL**

**Step 3: Implement shared server container in `src/lib/servicebot/server.ts`**

Wire core services (db, configs, mailer) as a singleton for server-side use.

**Step 4: Implement route handlers**

- GET `/api/admin/servicebot/tickets` — list with pagination, optional subsidiary filter
- GET `/api/admin/servicebot/tasks` — list with state filter
- GET `/api/admin/servicebot/drafts` — list pending drafts
- POST `/api/admin/servicebot/drafts/[id]/approve` — approve + trigger send
- POST `/api/admin/servicebot/drafts/[id]/reject` — reject with reason

**Step 5: Shared error mapping in `src/lib/servicebot/http.ts`**

**Step 6: Run tests — expect PASS**

**Step 7: Commit**

```bash
git add src/app/api/admin/servicebot/ src/lib/servicebot/
git commit -m "feat(admin-api): add servicebot ticket/task/draft routes and draft approval actions"
```

---

## Task 5 — Admin Dashboard UI (`/admin/servicebot`)

**Files**
- Create: `src/app/admin/servicebot/page.tsx`
- Create: `src/app/admin/servicebot/tickets/page.tsx`
- Create: `src/app/admin/servicebot/tasks/page.tsx`
- Create: `src/app/admin/servicebot/drafts/page.tsx`
- Create: `src/app/admin/servicebot/components/TicketsTable.tsx`
- Create: `src/app/admin/servicebot/components/TasksTable.tsx`
- Create: `src/app/admin/servicebot/components/DraftsQueue.tsx`
- Create: `src/app/admin/servicebot/components/ApprovalActions.tsx`
- Create: `src/lib/servicebot/client.ts`
- Test: `src/app/admin/servicebot/components/__tests__/DraftsQueue.test.tsx`
- Test: `src/app/admin/servicebot/components/__tests__/ApprovalActions.test.tsx`

**Step 1: Write failing component tests for approve/reject states**

**Step 2: Run tests — expect FAIL**

**Step 3: Implement server-rendered list pages with client action components**

Draft queue card shows: customer, subject, generated response preview, approve/reject buttons, status badges (pending, approved, sent, rejected).

**Step 4: Centralize API client in `src/lib/servicebot/client.ts`**

**Step 5: Run tests — expect PASS**

**Step 6: Commit**

```bash
git add src/app/admin/servicebot/ src/lib/servicebot/client.ts
git commit -m "feat(admin-ui): add servicebot dashboard pages with draft approval workflow"
```

---

## Task 6 — Multi-Client Onboarding Service + CLI + API

**Files**
- Create: `packages/core/src/onboarding/register-client.ts`
- Create: `service/src/cli/register-client.ts`
- Create: `src/app/api/admin/servicebot/onboarding/route.ts`
- Modify: `packages/core/src/db/database.ts`
- Modify: `service/package.json`
- Test: `packages/core/test/onboarding/register-client.test.ts`
- Test: `service/test/cli/register-client.test.ts`

**Step 1: Write failing tests**

```ts
describe("registerClient", () => {
  it("registers valid config and returns client ID", async () => {
    const result = await registerClientFromConfig({ config: validConfig, db, now: () => new Date() });
    expect(result.clientId).toBe("sunny-side-hvac");
    expect(result.created).toBe(true);
  });

  it("is idempotent for duplicate registrations", async () => {
    await registerClientFromConfig({ config: validConfig, db, now: () => new Date() });
    const result = await registerClientFromConfig({ config: validConfig, db, now: () => new Date() });
    expect(result.created).toBe(false);
  });

  it("returns validation errors for invalid config", async () => {
    await expect(registerClientFromConfig({ config: invalidConfig, db, now: () => new Date() }))
      .rejects.toThrow(/validation/i);
  });
});
```

**Step 2: Run tests — expect FAIL**

**Step 3: Implement shared registration service**

```ts
export async function registerClientFromConfig(input: {
  config: unknown;
  db: ServiceBotDatabase;
  now: () => Date;
}): Promise<{ clientId: string; created: boolean }>;
```

**Step 4: Add CLI command and API route (both use shared service)**

CLI: `pnpm --filter service register-client --config subsidiaries/acme.config.ts`

**Step 5: Run tests — expect PASS**

**Step 6: Commit**

```bash
git add packages/core/src/onboarding/ packages/core/test/onboarding/ service/src/cli/ service/test/cli/ src/app/api/admin/servicebot/onboarding/
git commit -m "feat(onboarding): add client registration service with cli and admin api"
```

---

## Task 7 — Webhook Dispatch with Retry + Audit

**Files**
- Create: `packages/core/src/webhooks/dispatcher.ts`
- Create: `packages/core/src/webhooks/retry-policy.ts`
- Create: `packages/core/src/webhooks/signer.ts`
- Create: `service/src/webhook-worker.ts`
- Modify: `service/src/scheduler.ts`
- Modify: `packages/core/src/tasks/state-machine.ts`
- Test: `packages/core/test/webhooks/dispatcher.test.ts`
- Test: `packages/core/test/webhooks/retry-policy.test.ts`
- Test: `service/test/webhook-worker.test.ts`

**Step 1: Write failing retry-policy tests**

```ts
describe("retryPolicy", () => {
  it("returns exponential backoff delays", () => {
    expect(nextDelayMs(1, 1000, 60000)).toBe(1000);
    expect(nextDelayMs(2, 1000, 60000)).toBe(2000);
    expect(nextDelayMs(3, 1000, 60000)).toBe(4000);
  });

  it("caps at max delay", () => {
    expect(nextDelayMs(10, 1000, 60000)).toBe(60000);
  });
});
```

**Step 2: Run tests — expect FAIL**

**Step 3: Implement retry-policy, dispatcher, signer**

Dispatcher: sends webhook via `fetch` with timeout + JSON payload. Includes HMAC-SHA256 signature header when secretEnv is configured.

**Step 4: Write failing dispatcher tests**

Test: sends on task.completed, sends on booking.created, includes signature, logs attempts.

**Step 5: Implement dispatcher and webhook-worker**

Worker loop in scheduler tick processes due retries from `webhook_attempts`.

**Step 6: Run tests — expect PASS**

**Step 7: Commit**

```bash
git add packages/core/src/webhooks/ packages/core/test/webhooks/ service/src/webhook-worker.ts service/test/
git commit -m "feat(webhooks): add event webhook dispatch with exponential retry and audit logging"
```

---

## Task 8 — Observability (Pino, Health, Metrics)

**Files**
- Create: `packages/core/src/observability/logger.ts`
- Create: `packages/core/src/observability/metrics.ts`
- Create: `src/app/api/health/route.ts`
- Modify: `service/src/index.ts`
- Modify: `service/src/scheduler.ts`
- Test: `packages/core/test/observability/metrics.test.ts`
- Test: `src/app/api/health/__tests__/route.test.ts`

**Step 1: Write failing metrics tests**

```ts
describe("Metrics", () => {
  it("increments counter", () => {
    const m = createMetrics();
    m.increment("emails_processed");
    m.increment("emails_processed");
    expect(m.snapshot().emails_processed).toBe(2);
  });

  it("resets on snapshot", () => {
    const m = createMetrics();
    m.increment("emails_processed");
    m.snapshot();
    expect(m.snapshot().emails_processed).toBe(0);
  });
});
```

**Step 2: Run tests — expect FAIL**

**Step 3: Implement pino logger factory and in-memory metrics**

Metrics: `emails_processed`, `tasks_created`, `drafts_sent`, `webhooks_delivered`

**Step 4: Implement health endpoint**

```ts
// src/app/api/health/route.ts
export async function GET() {
  return NextResponse.json({
    status: "ok",
    time: new Date().toISOString(),
    servicebot: { db: "ok", scheduler: "ok", metrics: metricsSnapshot() },
  });
}
```

**Step 5: Wire logger and metrics into service runner and scheduler**

**Step 6: Run tests — expect PASS**

**Step 7: Commit**

```bash
git add packages/core/src/observability/ packages/core/test/observability/ src/app/api/health/ service/src/
git commit -m "feat(observability): add pino logging, health endpoint, and interval metrics"
```

---

## Task 9 — End-to-End Approval + Send + Webhook Flow

**Files**
- Create: `service/test/phase2.e2e.test.ts`
- Create: `docs/runbooks/servicebot-phase2-ops.md`

**Step 1: Write E2E test**

Single test exercises full Phase 2 flow:
1. Intake email -> ticket/task/draft created
2. Admin approves draft -> SMTP send recorded (sent_at)
3. Task completion -> webhook delivered or queued retry
4. Metrics counters increment correctly

**Step 2: Run test — expect FAIL**

**Step 3: Fix integration seams, run — expect PASS**

**Step 4: Write operations runbook**

Document: required env vars, failure recovery, retry queue, manual replay, dashboard approval process.

**Step 5: Commit**

```bash
git add service/test/phase2.e2e.test.ts docs/runbooks/
git commit -m "test(e2e): cover phase2 full workflow and add operations runbook"
```

---

## Task 10 — Hardening + Release Gate

**Step 1: Run full test suite**

```bash
pnpm -r test
pnpm -r typecheck
```

**Step 2: Verify release checklist**

- No autonomous sends without `approved_at`
- Onboarding idempotency verified
- Webhook retry queue drains under nominal conditions
- Health endpoint and log format validated
- All tests green

**Step 3: Commit**

```bash
git commit -m "chore(release): phase2 readiness checklist and ci validation"
```

---

## Dependency DAG

```
Task 1 (config) ──┐
                   ├──> Task 3 (SMTP) ──> Task 4 (API) ──> Task 5 (UI)
Task 2 (DB)    ───┘         │
                             └──> Task 7 (webhooks)
Task 6 (onboarding) — independent, can parallel with Tasks 3-5
Task 8 (observability) — independent, can parallel with Tasks 3-7
Task 9 (E2E) — blocked by Tasks 3, 5, 7, 8
Task 10 (release) — blocked by all
```

## Non-Goals (Phase 2)

- No message queue introduction
- No PostgreSQL migration of ServiceBot core
- No autonomous outbound without explicit approval
- No multi-region deployment concerns
