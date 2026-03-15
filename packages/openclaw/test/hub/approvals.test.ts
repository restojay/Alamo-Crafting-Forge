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
