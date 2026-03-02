import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ServiceBotDatabase } from "@servicebot/core";
import { sendApprovedDraft } from "../../packages/core/src/email/smtp/sender.js";
import { dispatchWebhooks } from "../../packages/core/src/webhooks/dispatcher.js";
import { createMetrics } from "../../packages/core/src/observability/metrics.js";
import type { Ticket, Draft } from "@servicebot/core";
import type { WebhookConfig } from "../../packages/core/src/webhooks/dispatcher.js";

/**
 * Phase 2 E2E test: exercises the full approval → send → webhook flow.
 */
describe("Phase 2 E2E: approval → send → webhook", () => {
  let db: ServiceBotDatabase;

  beforeEach(() => {
    db = new ServiceBotDatabase(":memory:");
  });
  afterEach(() => {
    db.close();
  });

  it("full flow: intake → approve → send → webhook → metrics", async () => {
    const metrics = createMetrics();

    // 1. Intake: create ticket + task + draft (simulating Phase 1 flow)
    const ticket: Ticket = {
      id: "t1",
      subsidiaryId: "sunny-side-hvac",
      emailId: "email-001",
      subject: "AC not cooling",
      customerEmail: "jane@example.com",
      customerName: "Jane Smith",
      status: "open",
      createdAt: "2026-03-02T10:00:00Z",
      updatedAt: "2026-03-02T10:00:00Z",
    };
    db.saveTicket(ticket);
    metrics.increment("emails_processed");

    db.saveTask({
      id: "task-1",
      ticketId: "t1",
      subsidiaryId: "sunny-side-hvac",
      category: "repair",
      state: "new",
      description: "Schedule AC diagnostic",
      urgency: 2,
      dedupeHash: "hash-001",
      createdAt: "2026-03-02T10:00:00Z",
      updatedAt: "2026-03-02T10:00:00Z",
    });
    metrics.increment("tasks_created");

    const draft: Draft = {
      id: "d1",
      ticketId: "t1",
      body: "Hi Jane, we have received your request about AC not cooling. Our technician can visit tomorrow between 9-11 AM. Would that work for you?",
      approved: 0,
      createdAt: "2026-03-02T10:01:00Z",
    };
    db.saveDraft(draft);

    // 2. Admin approves the draft
    db.markDraftApproved("d1", "admin", "2026-03-02T11:00:00Z");
    const approved = db.getDraft("d1");
    expect(approved!.approved).toBe(1);
    expect(approved!.approvedBy).toBe("admin");

    // 3. SMTP send (mocked)
    const mailer = {
      send: vi.fn().mockResolvedValue({ messageId: "msg-e2e-001" }),
    };
    const sendResult = await sendApprovedDraft({
      draftId: "d1",
      db,
      mailer,
      smtpConfig: {
        host: "smtp.test.com",
        port: 587,
        secure: false,
        username: "u",
        passwordEnv: "SMTP_PASS",
        fromEmail: "ops@sunnysidehvac.com",
      },
      ticketEmail: "jane@example.com",
      now: () => "2026-03-02T11:01:00Z",
    });

    expect(sendResult.sent).toBe(true);
    expect(sendResult.messageId).toBe("msg-e2e-001");
    metrics.increment("drafts_sent");

    const sentDraft = db.getDraft("d1");
    expect(sentDraft!.sentAt).toBe("2026-03-02T11:01:00Z");

    // 4. Task completed → webhook dispatched
    db.updateTaskState("task-1", "done");

    const webhooks: WebhookConfig[] = [
      { event: "task.completed", url: "https://crm.example.com/hooks/task" },
    ];

    const mockFetch = vi.fn().mockResolvedValue({ ok: true, status: 200 });
    const webhookResult = await dispatchWebhooks({
      event: "task.completed",
      eventId: "task-1",
      payload: { taskId: "task-1", status: "done", subsidiaryId: "sunny-side-hvac" },
      subsidiaryId: "sunny-side-hvac",
      webhooks,
      db,
      now: () => "2026-03-02T11:02:00Z",
      fetchFn: mockFetch,
    });

    expect(webhookResult.dispatched).toBe(1);
    expect(webhookResult.failed).toBe(0);
    metrics.increment("webhooks_delivered");

    // 5. Metrics snapshot
    const snap = metrics.snapshot();
    expect(snap.emails_processed).toBe(1);
    expect(snap.tasks_created).toBe(1);
    expect(snap.drafts_sent).toBe(1);
    expect(snap.webhooks_delivered).toBe(1);

    // 6. Verify all data persisted
    const finalTickets = db.getOpenTickets("sunny-side-hvac");
    expect(finalTickets).toHaveLength(1);

    const tasks = db.getTasksByTicket("t1");
    expect(tasks[0].state).toBe("done");
  });

  it("idempotent re-send does not duplicate", async () => {
    db.saveTicket({
      id: "t2",
      subsidiaryId: "sub-1",
      emailId: "e2",
      subject: "Test",
      customerEmail: "c@test.com",
      customerName: "C",
      status: "open",
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-01-01T00:00:00Z",
    });
    db.saveDraft({
      id: "d2",
      ticketId: "t2",
      body: "Response",
      approved: 0,
      createdAt: "2026-01-01T00:00:00Z",
    });

    db.markDraftApproved("d2", "admin", "2026-03-02T12:00:00Z");

    const mailer = {
      send: vi.fn().mockResolvedValue({ messageId: "msg-idem" }),
    };
    const smtp = {
      host: "h",
      port: 587,
      secure: false,
      username: "u",
      passwordEnv: "P",
      fromEmail: "ops@acf.com",
    };

    // First send
    const r1 = await sendApprovedDraft({
      draftId: "d2",
      db,
      mailer,
      smtpConfig: smtp,
      ticketEmail: "c@test.com",
      now: () => "2026-03-02T12:01:00Z",
    });
    expect(r1.sent).toBe(true);

    // Second send (idempotent)
    const r2 = await sendApprovedDraft({
      draftId: "d2",
      db,
      mailer,
      smtpConfig: smtp,
      ticketEmail: "c@test.com",
      now: () => "2026-03-02T12:02:00Z",
    });
    expect(r2.sent).toBe(false);
    expect(r2.alreadySent).toBe(true);
    expect(mailer.send).toHaveBeenCalledTimes(1);
  });
});
