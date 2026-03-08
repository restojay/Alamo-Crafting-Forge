# ServiceBot Phase 2 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement ServiceBot Phase 2 in three sequential tracks: multi-tenant DB layer completion, dashboard observability UI, and SMTP live send — all behind safety gates.

**Architecture:** The SQLite schema already has `subsidiary_id` on all core tables. Track 1 fills in missing DB *methods* and syncs configs to the `subsidiaries` table. Track 2 rebuilds the admin UI with a subsidiary filter and ticket-detail click-through (removing the crude manual-ID entry on drafts). Track 3 wires real nodemailer transport behind an `SMTP_LIVE` env gate with test-mode recipient allowlisting.

**Tech Stack:** TypeScript, Next.js 16, better-sqlite3, Vitest, nodemailer, pnpm workspaces

**Governance:** Strategic Deliverable — council sign-off 2026-03-03. SMTP_LIVE defaults false. Test address: restojay01@gmail.com.

---

## Track 1 — Multi-Tenant DB Layer

### Task 1: Add Subsidiary type and DB read/write methods

**Context:** The `subsidiaries` table exists in 001_init.sql but `ServiceBotDatabase` has zero methods for it. `registerClientFromConfig` stores subsidiary data in `sync_state` (wrong table). We need `Subsidiary` typed, plus `saveSubsidiary` / `listSubsidiaries` on the DB class.

**Files:**
- Modify: `packages/core/src/db/types.ts`
- Modify: `packages/core/src/db/database.ts`
- Test: `packages/core/test/db/database.test.ts`

**Step 1: Write the failing tests**

Add to `packages/core/test/db/database.test.ts` (find the describe block for the DB, add after existing tests):

```typescript
import { ServiceBotDatabase } from "../../src/db/database";
import { Subsidiary } from "../../src/db/types"; // will fail: not exported yet
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";

// (add inside existing describe or new describe block)
describe("subsidiaries", () => {
  let db: ServiceBotDatabase;
  beforeEach(() => {
    db = new ServiceBotDatabase(join(tmpdir(), `test-${randomUUID()}.db`));
  });
  afterEach(() => db.close());

  it("saves and lists a subsidiary", () => {
    db.saveSubsidiary({ id: "acf-hvac", name: "Sunny HVAC", configJson: "{}", createdAt: "2026-01-01T00:00:00Z" });
    const list = db.listSubsidiaries();
    expect(list).toHaveLength(1);
    expect(list[0].id).toBe("acf-hvac");
    expect(list[0].name).toBe("Sunny HVAC");
  });

  it("saveSubsidiary is idempotent (upsert)", () => {
    db.saveSubsidiary({ id: "acf-hvac", name: "Old Name", configJson: "{}", createdAt: "2026-01-01T00:00:00Z" });
    db.saveSubsidiary({ id: "acf-hvac", name: "New Name", configJson: "{}", createdAt: "2026-01-01T00:00:00Z" });
    const list = db.listSubsidiaries();
    expect(list).toHaveLength(1);
    expect(list[0].name).toBe("New Name");
  });

  it("listSubsidiaries returns empty array when none exist", () => {
    expect(db.listSubsidiaries()).toEqual([]);
  });
});
```

**Step 2: Run tests to verify they fail**

```bash
cd "C:/Users/Jay/OneDrive/Desktop/Alamo-Crafting-Forge"
pnpm --filter @servicebot/core test
```
Expected: FAIL — `Subsidiary` not exported, `saveSubsidiary` / `listSubsidiaries` not defined.

**Step 3: Add Subsidiary type**

In `packages/core/src/db/types.ts`, add at the end:

```typescript
export interface Subsidiary {
  id: string;
  name: string;
  configJson: string;
  createdAt: string;
}
```

**Step 4: Add DB methods**

In `packages/core/src/db/database.ts`, add after the `// ── Contacts` section (around line 349):

```typescript
// ── Subsidiaries ─────────────────────────────────────────────

saveSubsidiary(s: { id: string; name: string; configJson: string; createdAt: string }): void {
  this.db
    .prepare(
      `INSERT INTO subsidiaries (id, name, config_json, created_at)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET name = excluded.name, config_json = excluded.config_json`,
    )
    .run(s.id, s.name, s.configJson, s.createdAt);
}

listSubsidiaries(): { id: string; name: string; configJson: string; createdAt: string }[] {
  const rows = this.db
    .prepare("SELECT id, name, config_json, created_at FROM subsidiaries ORDER BY name ASC")
    .all() as Record<string, unknown>[];
  return rows.map((r) => ({
    id: r.id as string,
    name: r.name as string,
    configJson: r.config_json as string,
    createdAt: r.created_at as string,
  }));
}
```

**Step 5: Export from index**

In `packages/core/src/index.ts`, add to the Database exports line:

```typescript
export type { Ticket, Task, TaskState, Draft, Contact, AuditEntry, TicketStatus, Urgency, WebhookAttempt, Subsidiary } from "./db/types";
```

**Step 6: Run tests to verify they pass**

```bash
pnpm --filter @servicebot/core test
```
Expected: PASS — all existing + new subsidiary tests green.

**Step 7: Commit**

```bash
git add packages/core/src/db/types.ts packages/core/src/db/database.ts packages/core/src/index.ts packages/core/test/db/database.test.ts
git commit -m "feat(core): add Subsidiary type, saveSubsidiary, listSubsidiaries to ServiceBotDatabase"
```

---

### Task 2: Fix registerClientFromConfig to sync to subsidiaries table

**Context:** Currently `registerClientFromConfig` stores registration data in `sync_state` (a key-value store), not the `subsidiaries` table. The dashboard needs to list subsidiaries from the proper table. Fix this to upsert into `subsidiaries` (keeping `sync_state` write for backward compat).

**Files:**
- Modify: `packages/core/src/onboarding/register-client.ts`
- Test: `packages/core/test/onboarding/register-client.test.ts`

**Step 1: Read the existing register-client test**

Open `packages/core/test/onboarding/register-client.test.ts` and find the test structure.

**Step 2: Write the failing test**

Add to that test file:

```typescript
it("syncs registered client to subsidiaries table", async () => {
  const db = new ServiceBotDatabase(join(tmpdir(), `test-${randomUUID()}.db`));
  const result = await registerClientFromConfig({
    config: validConfig, // use the existing valid config fixture in that file
    db,
    now: () => new Date("2026-01-01"),
  });
  const subsidiaries = db.listSubsidiaries();
  expect(subsidiaries).toHaveLength(1);
  expect(subsidiaries[0].id).toBe(result.clientId);
  db.close();
});
```

**Step 3: Run test to verify it fails**

```bash
pnpm --filter @servicebot/core test -- --reporter verbose register-client
```
Expected: FAIL — `listSubsidiaries` returns empty (not synced).

**Step 4: Update registerClientFromConfig**

In `packages/core/src/onboarding/register-client.ts`, inside `registerClientFromConfig`, after `const config = validation.config;` and before the `existing` check, add the upsert:

```typescript
// Always upsert into subsidiaries table (idempotent)
input.db.saveSubsidiary({
  id: config.id,
  name: config.name,
  configJson: JSON.stringify(config),
  createdAt: input.now().toISOString(),
});
```

Keep the existing `sync_state` write intact (backward compat for the `created: false` idempotency check).

**Step 5: Run test to verify it passes**

```bash
pnpm --filter @servicebot/core test
```
Expected: PASS — all tests green.

**Step 6: Commit**

```bash
git add packages/core/src/onboarding/register-client.ts packages/core/test/onboarding/register-client.test.ts
git commit -m "feat(core): sync registered clients to subsidiaries table"
```

---

### Task 3: Add /api/admin/servicebot/subsidiaries route

**Context:** The admin UI needs to fetch the list of subsidiaries for the filter dropdown. Add a GET route that returns `db.listSubsidiaries()`.

**Files:**
- Create: `src/app/api/admin/servicebot/subsidiaries/route.ts`

**Step 1: Write the test (integration — check existing admin-operations test for pattern)**

No new test file needed — add to `packages/core/test/integration/admin-operations.test.ts`. But since Next.js route handlers can't be unit-tested easily, verify manually in Step 4. Add a type-level check instead:

In `packages/core/test/smoke.test.ts`, verify the export compiles:

```typescript
import { ServiceBotDatabase } from "@servicebot/core";
// Type smoke test: listSubsidiaries must exist on the class
const _: keyof ServiceBotDatabase = "listSubsidiaries";
```

**Step 2: Create the route file**

Create `src/app/api/admin/servicebot/subsidiaries/route.ts`:

```typescript
import { getServiceBotDb } from "@/lib/servicebot/server";
import { jsonOk, jsonError } from "@/lib/servicebot/http";

/**
 * GET /api/admin/servicebot/subsidiaries
 *
 * List all registered subsidiaries (id + name).
 */
export async function GET() {
  try {
    const db = getServiceBotDb();
    const subsidiaries = db.listSubsidiaries().map((s) => ({
      id: s.id,
      name: s.name,
    }));
    return jsonOk({ subsidiaries });
  } catch (err) {
    return jsonError(
      err instanceof Error ? err.message : "Internal error",
      500,
    );
  }
}
```

**Step 3: Add to client.ts**

In `src/lib/servicebot/client.ts`, add:

```typescript
export async function fetchSubsidiaries() {
  const res = await fetch(`${BASE}/subsidiaries`);
  if (!res.ok) throw new Error(`Failed to fetch subsidiaries: ${res.status}`);
  return res.json() as Promise<{ subsidiaries: { id: string; name: string }[] }>;
}
```

**Step 4: Manual verification**

```bash
pnpm dev
# In browser: visit http://localhost:3000/api/admin/servicebot/subsidiaries
# Expected: { "subsidiaries": [] }  (empty — no configs registered yet)
# Stop dev server (Ctrl+C)
```

**Step 5: Run full test suite**

```bash
pnpm --filter @servicebot/core test
```
Expected: PASS.

**Step 6: Commit**

```bash
git add src/app/api/admin/servicebot/subsidiaries/route.ts src/lib/servicebot/client.ts
git commit -m "feat(api): GET /api/admin/servicebot/subsidiaries route"
```

---

## Track 2 — Dashboard Observability UI

### Task 4: Add subsidiary filter to tickets page

**Context:** `TicketsTable` fetches all open tickets with no filter. The API already supports `?subsidiary=<id>`. Wire a subsidiary selector dropdown that re-fetches on change. The subsidiary list comes from the new `/api/admin/servicebot/subsidiaries` endpoint.

**Files:**
- Modify: `src/app/admin/servicebot/components/TicketsTable.tsx`

**Step 1: No unit test for this UI component — verify visually in Step 4**

**Step 2: Rewrite TicketsTable to accept subsidiaryId prop and add filter**

Replace the full content of `src/app/admin/servicebot/components/TicketsTable.tsx`:

```typescript
"use client";

import { useEffect, useState } from "react";
import { fetchTickets, fetchSubsidiaries } from "@/lib/servicebot/client";
import Link from "next/link";

interface Ticket {
  id: string;
  subsidiaryId: string;
  subject: string;
  customerEmail: string;
  customerName: string;
  status: string;
  createdAt: string;
}

export function TicketsTable() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [subsidiaries, setSubsidiaries] = useState<{ id: string; name: string }[]>([]);
  const [filter, setFilter] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSubsidiaries().then((d) => setSubsidiaries(d.subsidiaries));
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchTickets(filter || undefined)
      .then((data) => setTickets(data.tickets))
      .finally(() => setLoading(false));
  }, [filter]);

  return (
    <div>
      <div className="mb-4 flex items-center gap-3">
        <label className="text-sm font-medium text-gray-700">Subsidiary</label>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="rounded border px-2 py-1 text-sm"
        >
          <option value="">All subsidiaries</option>
          {subsidiaries.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
      </div>
      {loading ? (
        <p className="text-gray-500">Loading tickets...</p>
      ) : tickets.length === 0 ? (
        <p className="text-gray-500">No open tickets.</p>
      ) : (
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b text-gray-600">
              <th className="pb-2">ID</th>
              <th className="pb-2">Subject</th>
              <th className="pb-2">Customer</th>
              <th className="pb-2">Subsidiary</th>
              <th className="pb-2">Created</th>
            </tr>
          </thead>
          <tbody>
            {tickets.map((t) => (
              <tr key={t.id} className="border-b hover:bg-gray-50">
                <td className="py-2 font-mono text-xs">
                  <Link
                    href={`/admin/servicebot/tickets/${t.id}`}
                    className="text-blue-600 underline hover:text-blue-800"
                  >
                    {t.id.slice(0, 8)}
                  </Link>
                </td>
                <td className="py-2">
                  <Link href={`/admin/servicebot/tickets/${t.id}`} className="hover:underline">
                    {t.subject}
                  </Link>
                </td>
                <td className="py-2">{t.customerEmail}</td>
                <td className="py-2 text-xs text-gray-500">{t.subsidiaryId}</td>
                <td className="py-2 text-xs text-gray-500">{t.createdAt.slice(0, 10)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
```

**Step 3: Run linter**

```bash
pnpm lint
```
Expected: no errors.

**Step 4: Visual verify**

```bash
pnpm dev
# Visit http://localhost:3000/admin/servicebot/tickets
# Verify: dropdown shows "All subsidiaries", tickets load, clicking ID navigates (404 for now — detail page in next task)
# Stop dev server
```

**Step 5: Commit**

```bash
git add src/app/admin/servicebot/components/TicketsTable.tsx
git commit -m "feat(ui): subsidiary filter + click-through links on tickets table"
```

---

### Task 5: Ticket detail page with drafts and routing info

**Context:** Clicking a ticket ID currently 404s. Build `/admin/servicebot/tickets/[id]/page.tsx` that shows ticket info, its drafts queue, and which subsidiary it belongs to. This page replaces the manual-entry drafts UX.

**Files:**
- Create: `src/app/api/admin/servicebot/tickets/[id]/route.ts`
- Create: `src/app/admin/servicebot/tickets/[id]/page.tsx`

**Step 1: Create the ticket detail API route**

Create `src/app/api/admin/servicebot/tickets/[id]/route.ts`:

```typescript
import { NextRequest } from "next/server";
import { getServiceBotDb } from "@/lib/servicebot/server";
import { jsonOk, jsonError } from "@/lib/servicebot/http";

/**
 * GET /api/admin/servicebot/tickets/[id]
 *
 * Return a single ticket by ID.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const db = getServiceBotDb();
    const ticket = db.getTicket(id);
    if (!ticket) return jsonError("Ticket not found", 404);
    return jsonOk({ ticket });
  } catch (err) {
    return jsonError(err instanceof Error ? err.message : "Internal error", 500);
  }
}
```

**Step 2: Add fetchTicket to client.ts**

In `src/lib/servicebot/client.ts`, add:

```typescript
export async function fetchTicket(id: string) {
  const res = await fetch(`${BASE}/tickets/${id}`);
  if (!res.ok) throw new Error(`Failed to fetch ticket: ${res.status}`);
  return res.json() as Promise<{ ticket: { id: string; subsidiaryId: string; subject: string; customerEmail: string; customerName: string; status: string; createdAt: string } }>;
}
```

**Step 3: Create the ticket detail page**

Create `src/app/admin/servicebot/tickets/[id]/page.tsx`:

```typescript
"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { fetchTicket } from "@/lib/servicebot/client";
import { DraftsQueue } from "../../components/DraftsQueue";

interface Ticket {
  id: string;
  subsidiaryId: string;
  subject: string;
  customerEmail: string;
  customerName: string;
  status: string;
  createdAt: string;
}

export default function TicketDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchTicket(id)
      .then((d) => setTicket(d.ticket))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <main className="mx-auto max-w-4xl p-8"><p className="text-gray-500">Loading...</p></main>;
  if (error) return <main className="mx-auto max-w-4xl p-8"><p className="text-red-600">{error}</p></main>;
  if (!ticket) return null;

  return (
    <main className="mx-auto max-w-4xl p-8">
      <div className="mb-6">
        <Link href="/admin/servicebot/tickets" className="text-sm text-blue-600 hover:underline">
          ← Back to tickets
        </Link>
      </div>

      <div className="mb-6 rounded-lg border p-4">
        <div className="mb-1 flex items-center justify-between">
          <h1 className="text-xl font-bold">{ticket.subject}</h1>
          <span className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
            {ticket.status}
          </span>
        </div>
        <div className="mt-2 space-y-1 text-sm text-gray-600">
          <p><span className="font-medium">Customer:</span> {ticket.customerName} &lt;{ticket.customerEmail}&gt;</p>
          <p><span className="font-medium">Subsidiary:</span> {ticket.subsidiaryId}</p>
          <p><span className="font-medium">Created:</span> {ticket.createdAt.slice(0, 19).replace("T", " ")}</p>
          <p className="font-mono text-xs text-gray-400">ID: {ticket.id}</p>
        </div>
      </div>

      <h2 className="mb-3 text-lg font-semibold">Draft Responses</h2>
      <DraftsQueue ticketId={ticket.id} ticketEmail={ticket.customerEmail} />
    </main>
  );
}
```

**Step 4: Lint**

```bash
pnpm lint
```
Expected: no errors.

**Step 5: Visual verify**

```bash
pnpm dev
# Visit http://localhost:3000/admin/servicebot/tickets
# Click any ticket ID link → should load ticket detail with subject, customer, subsidiary, drafts
# Stop dev server
```

**Step 6: Commit**

```bash
git add src/app/api/admin/servicebot/tickets/[id]/route.ts src/app/admin/servicebot/tickets/[id]/page.tsx src/lib/servicebot/client.ts
git commit -m "feat(ui): ticket detail page with routing info and drafts queue"
```

---

### Task 6: Simplify drafts page + add SMTP mode badge to dashboard

**Context:** The `/admin/servicebot/drafts` page currently asks for a manual ticket ID and email — now that drafts are accessed via the ticket detail page, this page can redirect users there. Also add an SMTP mode indicator badge to the dashboard landing page.

**Files:**
- Modify: `src/app/admin/servicebot/drafts/page.tsx`
- Modify: `src/app/admin/servicebot/page.tsx`

**Step 1: Simplify drafts page to redirect to tickets**

Replace the content of `src/app/admin/servicebot/drafts/page.tsx`:

```typescript
import Link from "next/link";

export default function DraftsPage() {
  return (
    <main className="mx-auto max-w-4xl p-8">
      <h1 className="mb-4 text-2xl font-bold">Draft Responses</h1>
      <p className="text-gray-600">
        Drafts are now reviewed from the{" "}
        <Link href="/admin/servicebot/tickets" className="text-blue-600 underline hover:text-blue-800">
          ticket detail view
        </Link>
        . Select a ticket to review and approve its drafts.
      </p>
    </main>
  );
}
```

**Step 2: Add SMTP mode badge to dashboard**

Replace the content of `src/app/admin/servicebot/page.tsx`:

```typescript
import Link from "next/link";

const smtpLive = process.env.SMTP_LIVE === "true";

export default function ServiceBotDashboard() {
  return (
    <main className="mx-auto max-w-4xl p-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">ServiceBot Admin</h1>
        <span
          className={`rounded px-3 py-1 text-xs font-medium ${
            smtpLive
              ? "bg-green-100 text-green-700"
              : "bg-yellow-100 text-yellow-700"
          }`}
        >
          SMTP: {smtpLive ? "LIVE" : "DRY-RUN"}
        </span>
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

**Step 3: Lint and visual verify**

```bash
pnpm lint
pnpm dev
# Dashboard should show "SMTP: DRY-RUN" badge (yellow)
# Stop dev server
```

**Step 4: Commit**

```bash
git add src/app/admin/servicebot/drafts/page.tsx src/app/admin/servicebot/page.tsx
git commit -m "feat(ui): SMTP mode badge on dashboard, redirect drafts page to ticket detail"
```

---

## Track 3 — SMTP Live Send

### Task 7: Install nodemailer and wire real transport

**Context:** `getMailer()` in `src/lib/servicebot/server.ts` currently throws unconditionally. Replace the stub with a real nodemailer transport factory. Gate live sending on `SMTP_LIVE=true` env var. When not live, redirect sends to `SMTP_TEST_RECIPIENT` (default: `restojay01@gmail.com`).

**Files:**
- Modify: `src/lib/servicebot/server.ts`

**Step 1: Install nodemailer**

```bash
cd "C:/Users/Jay/OneDrive/Desktop/Alamo-Crafting-Forge"
pnpm add nodemailer
pnpm add -D @types/nodemailer
```

**Step 2: Write the failing test**

Add `src/lib/servicebot/server.test.ts` (root vitest config includes `src/**`):

```typescript
import { describe, it, expect, vi } from "vitest";

// Mock nodemailer before importing server
vi.mock("nodemailer", () => ({
  default: {
    createTransport: vi.fn(() => ({
      sendMail: vi.fn().mockResolvedValue({ messageId: "test-id-123" }),
    })),
  },
}));

// Reset module registry so env changes take effect
describe("getMailer", () => {
  it("in dry-run mode, overrides recipient to SMTP_TEST_RECIPIENT", async () => {
    process.env.SMTP_LIVE = "false";
    process.env.SMTP_TEST_RECIPIENT = "restojay01@gmail.com";

    const { getMailer } = await import("./server");
    const mailer = getMailer();

    const nodemailer = await import("nodemailer");
    const mockTransport = (nodemailer.default.createTransport as ReturnType<typeof vi.fn>).mock.results[0]?.value;

    await mailer.send({
      to: "customer@example.com",
      subject: "Test",
      text: "Hello",
      smtp: {
        host: "smtp.gmail.com",
        port: 587,
        secure: false,
        username: "from@example.com",
        passwordEnv: "TEST_SMTP_PASS",
        fromEmail: "from@example.com",
      },
    });

    expect(mockTransport?.sendMail).toHaveBeenCalledWith(
      expect.objectContaining({ to: "restojay01@gmail.com" }),
    );
  });
});
```

**Step 3: Run test to verify it fails**

```bash
pnpm test
```
Expected: FAIL — `getMailer` throws "SMTP not configured".

**Step 4: Wire nodemailer in server.ts**

Replace the full content of `src/lib/servicebot/server.ts`:

```typescript
import nodemailer from "nodemailer";
import { ServiceBotDatabase } from "@servicebot/core";
import { createMailer } from "@servicebot/core";
import type { OutboundMailer, SendInput } from "@servicebot/core";
import type { SubsidiaryConfig } from "@servicebot/core";

let db: ServiceBotDatabase | null = null;

export function getServiceBotDb(): ServiceBotDatabase {
  if (!db) {
    const dbPath = process.env.SERVICEBOT_DB_PATH || "./servicebot.db";
    db = new ServiceBotDatabase(dbPath);
  }
  return db;
}

const SMTP_LIVE = process.env.SMTP_LIVE === "true";
const SMTP_TEST_RECIPIENT = process.env.SMTP_TEST_RECIPIENT || "restojay01@gmail.com";

export function getMailer(): OutboundMailer {
  const baseMailer = createMailer((config: NonNullable<SubsidiaryConfig["smtp"]>) => {
    const password = process.env[config.passwordEnv];
    if (!password) {
      throw new Error(`SMTP password env var not set: ${config.passwordEnv}`);
    }
    return nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: { user: config.username, pass: password },
    });
  });

  if (SMTP_LIVE) {
    return baseMailer;
  }

  // Dry-run: intercept all sends and redirect to test recipient
  return {
    async send(input: SendInput) {
      const dryRunInput: SendInput = {
        ...input,
        to: SMTP_TEST_RECIPIENT,
        subject: `[DRY-RUN → ${input.to}] ${input.subject}`,
      };
      return baseMailer.send(dryRunInput);
    },
  };
}
```

**Step 5: Run test to verify it passes**

```bash
pnpm test
```
Expected: PASS — all tests green including the new mailer test.

**Step 6: Commit**

```bash
git add src/lib/servicebot/server.ts src/lib/servicebot/server.test.ts
git commit -m "feat(smtp): wire nodemailer transport with SMTP_LIVE gate and test-recipient dry-run"
```

---

### Task 8: Wire SMTP config from subsidiary to approve route

**Context:** The approve route (`POST /api/admin/servicebot/drafts/[id]/approve`) already accepts `smtpConfig` in the body, but the client (`approveDraft` in `client.ts`) never sends it. The subsidiary's SMTP config lives in the `config_json` column of the `subsidiaries` table. Wire it: the server fetches the subsidiary's config, extracts the SMTP block, and passes it to `sendApprovedDraft`. The client no longer needs to know about SMTP.

**Files:**
- Modify: `src/app/api/admin/servicebot/drafts/[id]/approve/route.ts`
- Modify: `src/lib/servicebot/server.ts` (add `getSubsidiarySmtpConfig` helper)

**Step 1: Add helper to server.ts**

In `src/lib/servicebot/server.ts`, add at the end:

```typescript
export function getSubsidiarySmtpConfig(subsidiaryId: string): NonNullable<SubsidiaryConfig["smtp"]> | null {
  const db = getServiceBotDb();
  const subsidiaries = db.listSubsidiaries();
  const found = subsidiaries.find((s) => s.id === subsidiaryId);
  if (!found) return null;
  try {
    const config = JSON.parse(found.configJson) as SubsidiaryConfig;
    return config.smtp ?? null;
  } catch {
    return null;
  }
}
```

**Step 2: Update approve route**

Replace `src/app/api/admin/servicebot/drafts/[id]/approve/route.ts`:

```typescript
import { NextRequest } from "next/server";
import { getServiceBotDb, getMailer, getSubsidiarySmtpConfig } from "@/lib/servicebot/server";
import { sendApprovedDraft } from "@servicebot/core";
import { jsonOk, jsonError } from "@/lib/servicebot/http";

/**
 * POST /api/admin/servicebot/drafts/[id]/approve
 *
 * Approve a draft. If the ticket's subsidiary has SMTP configured,
 * sends via the mailer (dry-run or live depending on SMTP_LIVE env).
 * Body: { actor: string, ticketEmail: string }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { actor, ticketEmail } = body;

    if (!actor || !ticketEmail) {
      return jsonError("actor and ticketEmail are required", 400);
    }

    const db = getServiceBotDb();
    db.markDraftApproved(id, actor, new Date().toISOString());

    const draft = db.getDraft(id);
    if (!draft) return jsonError("Draft not found after approval", 500);

    const ticket = db.getTicket(draft.ticketId);
    const smtpConfig = ticket ? getSubsidiarySmtpConfig(ticket.subsidiaryId) : null;

    if (smtpConfig) {
      const mailer = getMailer();
      const result = await sendApprovedDraft({
        draftId: id,
        db,
        mailer,
        smtpConfig,
        ticketEmail,
        now: () => new Date().toISOString(),
      });
      return jsonOk({ approved: true, ...result });
    }

    return jsonOk({ approved: true, sent: false, reason: "no SMTP config for subsidiary" });
  } catch (err) {
    return jsonError(
      err instanceof Error ? err.message : "Internal error",
      500,
    );
  }
}
```

**Step 3: Run full test suite**

```bash
pnpm --filter @servicebot/core test
pnpm test
```
Expected: all green.

**Step 4: Commit**

```bash
git add src/app/api/admin/servicebot/drafts/[id]/approve/route.ts src/lib/servicebot/server.ts
git commit -m "feat(smtp): auto-resolve SMTP config from subsidiary on draft approval"
```

---

### Task 9: End-to-end dry-run smoke test with restojay01@gmail.com

**Context:** Before any production use, verify the full pipeline manually: register a test subsidiary with SMTP config, create a synthetic ticket + draft via the DB CLI or onboarding API, approve the draft in the UI, and confirm the email arrives at restojay01@gmail.com.

**Note:** This task requires a Gmail App Password set in the environment. If one isn't configured yet, you'll see a clear error: `SMTP password env var not set: <KEY>`. That's the expected gate — follow Step 1 to set it up.

**Step 1: Create Gmail App Password (if not already done)**

1. Go to https://myaccount.google.com/apppasswords
2. Create an app password for "ServiceBot Test"
3. Copy the 16-character password

**Step 2: Set test env vars**

Create `.env.local` in the repo root (it's already in .gitignore for Next.js):

```
SMTP_LIVE=false
SMTP_TEST_RECIPIENT=restojay01@gmail.com
SERVICEBOT_SMTP_TEST_PASS=<your-16-char-app-password>
```

**Step 3: Register test subsidiary via onboarding route**

Start the dev server:

```bash
pnpm dev
```

In a new terminal, register the HVAC subsidiary using curl:

```bash
curl -X POST http://localhost:3000/api/admin/servicebot/onboarding \
  -H "Content-Type: application/json" \
  -d @subsidiaries/sunny-side-hvac.config.ts
```

Note: The onboarding route expects JSON. If it requires a full config object, POST the config fields directly.

Read `src/app/api/admin/servicebot/onboarding/route.ts` to see the expected body shape, then craft the correct curl.

**Step 4: Create a synthetic ticket + draft**

Write a one-off seed script `scripts/seed-test-ticket.ts`:

```typescript
import { ServiceBotDatabase } from "@servicebot/core";
import { randomUUID } from "node:crypto";

const db = new ServiceBotDatabase("./servicebot.db");
const ticketId = randomUUID();
const draftId = randomUUID();

db.saveTicket({
  id: ticketId,
  subsidiaryId: "sunny-side-hvac",
  emailId: `test-email-${Date.now()}`,
  subject: "Test: AC not cooling",
  customerEmail: "restojay01@gmail.com",
  customerName: "Jay (Test)",
  status: "open",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

db.saveDraft({
  id: draftId,
  ticketId,
  body: "Hi Jay,\n\nThank you for reaching out! We'll have a tech out to you within 4 hours.\n\nBest,\nSunny Side HVAC",
  approved: 0,
  createdAt: new Date().toISOString(),
});

console.log(`Created ticket ${ticketId} with draft ${draftId}`);
db.close();
```

Run it:

```bash
npx tsx scripts/seed-test-ticket.ts
```

**Step 5: Approve draft in UI and verify email**

1. Visit http://localhost:3000/admin/servicebot/tickets
2. Find the "Test: AC not cooling" ticket
3. Click it → ticket detail page
4. Click "Approve" on the draft
5. Check restojay01@gmail.com inbox
   - Expected subject: `[DRY-RUN → restojay01@gmail.com] Re: Test: AC not cooling`
   - Expected body: the draft text

**Step 6: Verify send log in DB**

```bash
npx tsx -e "
import { ServiceBotDatabase } from '@servicebot/core';
const db = new ServiceBotDatabase('./servicebot.db');
const stmt = db['db'].prepare(\"SELECT * FROM audit_log WHERE action = 'sent' ORDER BY created_at DESC LIMIT 5\");
console.log(stmt.all());
db.close();
"
```
Expected: audit log entry with `action: 'sent'` and a `messageId`.

**Step 7: Commit**

```bash
git add scripts/seed-test-ticket.ts
git commit -m "chore: add seed script for dry-run SMTP smoke test"
```

---

## Final: Full test suite + lint

**Step 1: Run everything**

```bash
cd "C:/Users/Jay/OneDrive/Desktop/Alamo-Crafting-Forge"
pnpm --filter @servicebot/core test
pnpm --filter subsidiaries test
pnpm test
pnpm lint
```
Expected: all passing, no lint errors.

**Step 2: Commit if any stray files**

```bash
git status
# If clean: done. If stray files: stage and commit with "chore: cleanup after phase 2 implementation"
```

---

## Environment Variables Reference

| Var | Default | Purpose |
|-|-|-|
| `SMTP_LIVE` | `false` | Set to `true` to send real email |
| `SMTP_TEST_RECIPIENT` | `restojay01@gmail.com` | Redirect target in dry-run mode |
| `SERVICEBOT_DB_PATH` | `./servicebot.db` | SQLite DB path |
| `<passwordEnv>` | — | Per-subsidiary SMTP password (set in subsidiary config's `passwordEnv` field) |

## Approved Scope (Council Sign-off 2026-03-03)

- Task 1-3: Multi-tenant DB methods + subsidiary sync + subsidiaries API
- Task 4-6: Dashboard UI — subsidiary filter, ticket detail, SMTP mode badge
- Task 7-9: SMTP nodemailer, dry-run gate, end-to-end smoke test

**Out of scope for this plan:** Redis/Postgres persistence, production SMTP for non-test subsidiaries, webhook retry UI.
