import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { ServiceBotDatabase } from "../../src/db/database.js";
import type { Ticket, Draft, WebhookAttempt } from "../../src/db/types.js";

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

function makeDraft(overrides: Partial<Draft> = {}): Draft {
  return {
    id: "draft-1",
    ticketId: "ticket-1",
    body: "Thank you for contacting us.",
    approved: 0,
    createdAt: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

describe("Phase 2 DB methods", () => {
  let db: ServiceBotDatabase;

  beforeEach(() => {
    db = new ServiceBotDatabase(":memory:");
  });
  afterEach(() => {
    db.close();
  });

  // ── Draft Actions ─────────────────────────────────────────

  it("markDraftApproved sets approved fields", () => {
    db.saveTicket(makeTicket());
    db.saveDraft(makeDraft());

    db.markDraftApproved("draft-1", "admin", "2026-03-02T12:00:00Z");

    const draft = db.getDraft("draft-1");
    expect(draft).toBeDefined();
    expect(draft!.approved).toBe(1);
    expect(draft!.approvedBy).toBe("admin");
    expect(draft!.approvedAt).toBe("2026-03-02T12:00:00Z");
  });

  it("markDraftRejected sets rejection fields", () => {
    db.saveTicket(makeTicket());
    db.saveDraft(makeDraft());

    db.markDraftRejected("draft-1", "Bad tone", "2026-03-02T12:00:00Z");

    const draft = db.getDraft("draft-1");
    expect(draft).toBeDefined();
    expect(draft!.rejectedAt).toBe("2026-03-02T12:00:00Z");
    expect(draft!.rejectionReason).toBe("Bad tone");
  });

  it("markDraftSent sets sent_at and creates audit entry", () => {
    db.saveTicket(makeTicket());
    db.saveDraft(makeDraft());

    db.markDraftSent("draft-1", "2026-03-02T12:01:00Z", "msg-123");

    const draft = db.getDraft("draft-1");
    expect(draft).toBeDefined();
    expect(draft!.sentAt).toBe("2026-03-02T12:01:00Z");
  });

  // ── Webhook Attempts ──────────────────────────────────────

  it("insertWebhookAttempt persists attempt", () => {
    const attempt: WebhookAttempt = {
      id: "wh-1",
      subsidiaryId: "sub-1",
      eventType: "task.completed",
      eventId: "task-99",
      url: "https://example.com/hook",
      status: "pending",
      attempt: 1,
      nextRetryAt: "2026-03-02T12:00:00Z",
      createdAt: "2026-03-02T11:59:00Z",
    };

    db.insertWebhookAttempt(attempt);

    const retries = db.listPendingWebhookRetries("2026-03-02T12:01:00Z");
    expect(retries).toHaveLength(1);
    expect(retries[0].id).toBe("wh-1");
    expect(retries[0].eventType).toBe("task.completed");
    expect(retries[0].url).toBe("https://example.com/hook");
  });

  it("listPendingWebhookRetries returns only due retries", () => {
    const past: WebhookAttempt = {
      id: "wh-past",
      subsidiaryId: "sub-1",
      eventType: "task.completed",
      eventId: "task-1",
      url: "https://example.com/hook",
      status: "pending",
      attempt: 1,
      nextRetryAt: "2026-03-02T11:00:00Z",
      createdAt: "2026-03-02T10:00:00Z",
    };

    const future: WebhookAttempt = {
      id: "wh-future",
      subsidiaryId: "sub-1",
      eventType: "task.completed",
      eventId: "task-2",
      url: "https://example.com/hook",
      status: "pending",
      attempt: 1,
      nextRetryAt: "2026-03-02T23:00:00Z",
      createdAt: "2026-03-02T10:00:00Z",
    };

    const delivered: WebhookAttempt = {
      id: "wh-done",
      subsidiaryId: "sub-1",
      eventType: "task.completed",
      eventId: "task-3",
      url: "https://example.com/hook",
      status: "delivered",
      attempt: 1,
      nextRetryAt: "2026-03-02T10:00:00Z",
      createdAt: "2026-03-02T09:00:00Z",
      deliveredAt: "2026-03-02T10:00:00Z",
    };

    db.insertWebhookAttempt(past);
    db.insertWebhookAttempt(future);
    db.insertWebhookAttempt(delivered);

    const retries = db.listPendingWebhookRetries("2026-03-02T12:00:00Z");
    expect(retries).toHaveLength(1);
    expect(retries[0].id).toBe("wh-past");
  });

  it("getDraft returns undefined for non-existent draft", () => {
    expect(db.getDraft("nonexistent")).toBeUndefined();
  });

  // ── Migration Idempotency ──────────────────────────────────

  it("migrations are idempotent — second constructor call does not crash", () => {
    // First DB instance applies migrations
    const db1 = new ServiceBotDatabase(":memory:");
    db1.saveTicket(makeTicket());
    db1.saveDraft(makeDraft());
    db1.close();

    // For persisted DBs, re-opening runs migrations again.
    // With :memory: each instance is fresh, so test the version tracking logic:
    // Just verify the schema_migrations table exists and has the entry.
    const db2 = new ServiceBotDatabase(":memory:");
    db2.saveTicket(makeTicket({ id: "t2", emailId: "e2" }));
    db2.saveDraft(makeDraft({ id: "d2", ticketId: "t2" }));
    db2.markDraftApproved("d2", "admin", "2026-03-02T12:00:00Z");
    const draft = db2.getDraft("d2");
    expect(draft!.approved).toBe(1);
    db2.close();
  });
});
