import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { sendApprovedDraft } from "../../../src/email/smtp/sender.js";
import { ServiceBotDatabase } from "../../../src/db/database.js";
import type { Ticket, Draft } from "../../../src/db/types.js";

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
    body: "We can help.",
    approved: 0,
    createdAt: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

const smtpConfig = {
  host: "h",
  port: 587,
  secure: false,
  username: "u",
  passwordEnv: "P",
  fromEmail: "ops@acf.com",
};

describe("sendApprovedDraft", () => {
  let db: ServiceBotDatabase;

  beforeEach(() => {
    db = new ServiceBotDatabase(":memory:");
  });
  afterEach(() => {
    db.close();
  });

  const setupApprovedDraft = () => {
    db.saveTicket(makeTicket());
    db.saveDraft(makeDraft());
    db.markDraftApproved("d1", "admin", "2026-03-02T12:00:00Z");
  };

  it("sends approved draft and marks sent", async () => {
    setupApprovedDraft();
    const mailer = {
      send: vi.fn().mockResolvedValue({ messageId: "msg-1" }),
    };

    const result = await sendApprovedDraft({
      draftId: "d1",
      db,
      mailer,
      smtpConfig,
      ticketEmail: "c@test.com",
      now: () => "2026-03-02T12:01:00Z",
    });

    expect(result.sent).toBe(true);
    expect(result.messageId).toBe("msg-1");
    expect(mailer.send).toHaveBeenCalledWith(
      expect.objectContaining({ subject: "Re: Help" }),
    );
    const draft = db.getDraft("d1");
    expect(draft!.sentAt).toBe("2026-03-02T12:01:00Z");
  });

  it("returns no-op if draft already sent (idempotent)", async () => {
    setupApprovedDraft();
    db.markDraftSent("d1", "2026-03-02T12:01:00Z", "msg-old");
    const mailer = { send: vi.fn() };

    const result = await sendApprovedDraft({
      draftId: "d1",
      db,
      mailer,
      smtpConfig,
      ticketEmail: "c@test.com",
      now: () => "now",
    });
    expect(result.sent).toBe(false);
    expect(result.alreadySent).toBe(true);
    expect(mailer.send).not.toHaveBeenCalled();
  });

  it("throws on send failure, draft stays approved but unsent", async () => {
    setupApprovedDraft();
    const mailer = {
      send: vi.fn().mockRejectedValue(new Error("SMTP down")),
    };

    await expect(
      sendApprovedDraft({
        draftId: "d1",
        db,
        mailer,
        smtpConfig,
        ticketEmail: "c@test.com",
        now: () => "now",
      }),
    ).rejects.toThrow("SMTP down");
    const draft = db.getDraft("d1");
    expect(draft!.approved).toBe(1);
    expect(draft!.sentAt).toBeUndefined();
  });

  it("throws if draft not found", async () => {
    const mailer = { send: vi.fn() };

    await expect(
      sendApprovedDraft({
        draftId: "nope",
        db,
        mailer,
        smtpConfig,
        ticketEmail: "c@test.com",
        now: () => "now",
      }),
    ).rejects.toThrow(/not found/i);
  });

  it("throws if draft not approved", async () => {
    db.saveTicket(makeTicket());
    db.saveDraft(makeDraft());
    const mailer = { send: vi.fn() };

    await expect(
      sendApprovedDraft({
        draftId: "d1",
        db,
        mailer,
        smtpConfig,
        ticketEmail: "c@test.com",
        now: () => "now",
      }),
    ).rejects.toThrow(/not approved/i);
  });
});
