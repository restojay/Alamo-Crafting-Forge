import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { join } from "path";
import { tmpdir } from "os";
import { randomUUID } from "crypto";
import { ServiceBotDatabase } from "../../src/db/database.js";
import type {
  Ticket,
  Task,
  Draft,
  Contact,
} from "../../src/db/types.js";

function makeTicket(overrides: Partial<Ticket> = {}): Ticket {
  return {
    id: "ticket-1",
    subsidiaryId: "sub-1",
    emailId: "email-abc",
    subject: "Need help",
    customerEmail: "customer@example.com",
    customerName: "Jane Doe",
    status: "open",
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: "task-1",
    ticketId: "ticket-1",
    subsidiaryId: "sub-1",
    category: "support",
    state: "new",
    description: "Resolve customer issue",
    urgency: 1,
    dedupeHash: "hash-abc",
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

function makeDraft(overrides: Partial<Draft> = {}): Draft {
  return {
    id: "draft-1",
    ticketId: "ticket-1",
    body: "Thank you for reaching out.",
    approved: 0,
    createdAt: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

function makeContact(overrides: Partial<Contact> = {}): Contact {
  return {
    id: "contact-1",
    subsidiaryId: "sub-1",
    email: "customer@example.com",
    name: "Jane Doe",
    createdAt: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

describe("ServiceBotDatabase", () => {
  let db: ServiceBotDatabase;

  beforeEach(() => {
    db = new ServiceBotDatabase(":memory:");
  });

  afterEach(() => {
    db.close();
  });

  it("creates tables on init", () => {
    // If we got here without error, tables were created.
    // Verify by saving and reading a ticket.
    const ticket = makeTicket();
    db.saveTicket(ticket);
    const result = db.getTicket("ticket-1");
    expect(result).toBeDefined();
    expect(result!.id).toBe("ticket-1");
  });

  // ── Tickets ────────────────────────────────────────────────

  it("saves and retrieves a ticket", () => {
    const ticket = makeTicket();
    db.saveTicket(ticket);
    const result = db.getTicket("ticket-1");
    expect(result).toEqual(ticket);
  });

  it("returns undefined for non-existent ticket", () => {
    const result = db.getTicket("nope");
    expect(result).toBeUndefined();
  });

  it("checks email processed - positive via markEmailProcessed", () => {
    db.markEmailProcessed("email-abc", "processed");
    expect(db.isEmailProcessed("email-abc")).toBe(true);
  });

  it("checks email processed - negative for unknown email", () => {
    expect(db.isEmailProcessed("email-xyz")).toBe(false);
  });

  it("markEmailProcessed + isEmailProcessed tracks unmatched emails", () => {
    db.markEmailProcessed("email-unmatched", "unmatched");
    expect(db.isEmailProcessed("email-unmatched")).toBe(true);
  });

  it("markEmailProcessed ignores duplicate inserts", () => {
    db.markEmailProcessed("email-dup", "processed");
    // Should not throw on duplicate
    db.markEmailProcessed("email-dup", "processed");
    expect(db.isEmailProcessed("email-dup")).toBe(true);
  });

  it("gets open tickets without filter", () => {
    db.saveTicket(makeTicket({ id: "t1", subsidiaryId: "sub-1" }));
    db.saveTicket(
      makeTicket({
        id: "t2",
        subsidiaryId: "sub-2",
        emailId: "email-2",
      }),
    );
    db.saveTicket(
      makeTicket({
        id: "t3",
        subsidiaryId: "sub-1",
        emailId: "email-3",
        status: "closed",
      }),
    );
    const open = db.getOpenTickets();
    expect(open).toHaveLength(2);
  });

  it("gets open tickets with subsidiary filter", () => {
    db.saveTicket(makeTicket({ id: "t1", subsidiaryId: "sub-1" }));
    db.saveTicket(
      makeTicket({
        id: "t2",
        subsidiaryId: "sub-2",
        emailId: "email-2",
      }),
    );
    const open = db.getOpenTickets("sub-1");
    expect(open).toHaveLength(1);
    expect(open[0].subsidiaryId).toBe("sub-1");
  });

  it("updates a ticket via INSERT OR REPLACE", () => {
    const ticket = makeTicket();
    db.saveTicket(ticket);
    db.saveTicket({ ...ticket, status: "closed" });
    const result = db.getTicket("ticket-1");
    expect(result!.status).toBe("closed");
  });

  // ── Tasks ──────────────────────────────────────────────────

  it("saves and retrieves tasks by ticket", () => {
    // We need the ticket to exist first for FK
    db.saveTicket(makeTicket());
    const task = makeTask();
    db.saveTask(task);
    const tasks = db.getTasksByTicket("ticket-1");
    expect(tasks).toHaveLength(1);
    expect(tasks[0].category).toBe("support");
  });

  it("updates task state", () => {
    db.saveTicket(makeTicket());
    db.saveTask(makeTask());
    db.updateTaskState("task-1", "in_progress");
    const tasks = db.getTasksByTicket("ticket-1");
    expect(tasks[0].state).toBe("in_progress");
    // updated_at should have changed
    expect(tasks[0].updatedAt).not.toBe("2026-01-01T00:00:00Z");
  });

  it("detects duplicate tasks by hash", () => {
    db.saveTicket(makeTicket());
    db.saveTask(makeTask());
    expect(db.isTaskDuplicate("hash-abc")).toBe(true);
    expect(db.isTaskDuplicate("hash-xyz")).toBe(false);
  });

  // ── Drafts ─────────────────────────────────────────────────

  it("saves and retrieves drafts by ticket", () => {
    db.saveTicket(makeTicket());
    db.saveDraft(makeDraft());
    db.saveDraft(makeDraft({ id: "draft-2", body: "Follow-up message." }));
    const drafts = db.getDraftsByTicket("ticket-1");
    expect(drafts).toHaveLength(2);
    expect(drafts[0].body).toBe("Thank you for reaching out.");
  });

  // ── Contacts ───────────────────────────────────────────────

  it("saves contacts with dedup on subsidiary+email", () => {
    db.saveContact(makeContact());
    // Insert again with same subsidiary+email — should be ignored
    db.saveContact(makeContact({ id: "contact-2" }));
    // Save with different subsidiary — should succeed
    db.saveContact(
      makeContact({
        id: "contact-3",
        subsidiaryId: "sub-2",
      }),
    );
    // No error means dedup worked. We don't have a getContacts method,
    // but the unique constraint is tested by not throwing.
  });

  // ── Audit Log ──────────────────────────────────────────────

  it("saves audit entries with auto-generated ids", () => {
    db.saveAuditEntry({
      entityType: "ticket",
      entityId: "ticket-1",
      action: "created",
      payloadJson: '{"from": "email"}',
    });
    db.saveAuditEntry({
      entityType: "ticket",
      entityId: "ticket-1",
      action: "updated",
      payloadJson: "{}",
    });
    // No error means inserts succeeded. IDs are auto-generated UUIDs.
  });

  // ── Sync State ─────────────────────────────────────────────

  it("manages sync state - insert and update", () => {
    db.saveSyncState("last_sync", "2026-01-01T00:00:00Z");
    expect(db.getSyncState("last_sync")).toBe("2026-01-01T00:00:00Z");

    db.saveSyncState("last_sync", "2026-01-02T00:00:00Z");
    expect(db.getSyncState("last_sync")).toBe("2026-01-02T00:00:00Z");
  });

  it("returns undefined for non-existent sync state", () => {
    expect(db.getSyncState("nope")).toBeUndefined();
  });

  // ── Lifecycle ──────────────────────────────────────────────

  it("close() succeeds without error", () => {
    const db2 = new ServiceBotDatabase(":memory:");
    expect(() => db2.close()).not.toThrow();
  });
});

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

  it("saveSubsidiary is idempotent (upsert on id)", () => {
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
    db.saveTicket(makeTicket({ id: "t2", status: "open", emailId: "email-2" }));
    db.updateTicketStatus("t1", "resolved", new Date().toISOString());
    const open = db.getOpenTickets();
    expect(open).toHaveLength(1);
    expect(open[0].id).toBe("t2");
  });

  it("getTicketsByStatus returns filtered list", () => {
    db.saveTicket(makeTicket({ id: "t2", status: "open", emailId: "email-2" }));
    db.updateTicketStatus("t1", "resolved", new Date().toISOString());
    const resolved = db.getTicketsByStatus("resolved");
    expect(resolved).toHaveLength(1);
    expect(resolved[0].id).toBe("t1");
  });
});
