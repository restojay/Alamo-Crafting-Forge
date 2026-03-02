import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ServiceBotDatabase } from "../../src/db/database.js";
import { sendApprovedDraft } from "../../src/email/smtp/sender.js";
import type { Ticket, Draft } from "../../src/db/types.js";

/**
 * Admin API integration tests — exercise the core operations
 * that the route handlers invoke. Route handlers are thin wrappers
 * over these core methods.
 */

function makeTicket(overrides: Partial<Ticket> = {}): Ticket {
  return {
    id: "t1",
    subsidiaryId: "sub-1",
    emailId: "e1",
    subject: "Help",
    customerEmail: "c@test.com",
    customerName: "C",
    status: "open",
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

function makeDraft(overrides: Partial<Draft> = {}): Draft {
  return {
    id: "d1",
    ticketId: "t1",
    body: "We can help you.",
    approved: 0,
    createdAt: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

describe("Admin ServiceBot API operations", () => {
  let db: ServiceBotDatabase;

  beforeEach(() => {
    db = new ServiceBotDatabase(":memory:");
  });
  afterEach(() => {
    db.close();
  });

  function seed() {
    db.saveTicket(makeTicket());
    db.saveDraft(makeDraft());
  }

  it("lists open tickets (all)", () => {
    seed();
    const tickets = db.getOpenTickets();
    expect(tickets).toHaveLength(1);
    expect(tickets[0].id).toBe("t1");
  });

  it("lists open tickets filtered by subsidiary", () => {
    seed();
    db.saveTicket(makeTicket({ id: "t2", subsidiaryId: "sub-2", emailId: "e2" }));
    const filtered = db.getOpenTickets("sub-1");
    expect(filtered).toHaveLength(1);
    expect(filtered[0].subsidiaryId).toBe("sub-1");
  });

  it("lists drafts for a ticket", () => {
    seed();
    const drafts = db.getDraftsByTicket("t1");
    expect(drafts).toHaveLength(1);
    expect(drafts[0].id).toBe("d1");
  });

  it("returns empty for unknown ticket", () => {
    const drafts = db.getDraftsByTicket("nonexistent");
    expect(drafts).toHaveLength(0);
  });

  it("approve + send flow works end-to-end", async () => {
    seed();
    db.markDraftApproved("d1", "admin", "2026-03-02T12:00:00Z");
    let draft = db.getDraft("d1");
    expect(draft!.approved).toBe(1);
    expect(draft!.approvedBy).toBe("admin");

    const mailer = { send: vi.fn().mockResolvedValue({ messageId: "msg-1" }) };
    const result = await sendApprovedDraft({
      draftId: "d1",
      db,
      mailer,
      smtpConfig: { host: "h", port: 587, secure: false, username: "u", passwordEnv: "P", fromEmail: "ops@acf.com" },
      ticketEmail: "c@test.com",
      now: () => "2026-03-02T12:01:00Z",
    });

    expect(result.sent).toBe(true);
    draft = db.getDraft("d1");
    expect(draft!.sentAt).toBe("2026-03-02T12:01:00Z");
  });

  it("reject flow stores reason", () => {
    seed();
    db.markDraftRejected("d1", "Tone too casual", "2026-03-02T12:00:00Z");
    const draft = db.getDraft("d1");
    expect(draft!.rejectionReason).toBe("Tone too casual");
    expect(draft!.rejectedAt).toBe("2026-03-02T12:00:00Z");
  });
});
