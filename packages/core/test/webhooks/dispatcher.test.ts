import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { dispatchWebhooks } from "../../src/webhooks/dispatcher.js";
import { ServiceBotDatabase } from "../../src/db/database.js";
import type { WebhookConfig } from "../../src/webhooks/dispatcher.js";

describe("dispatchWebhooks", () => {
  let db: ServiceBotDatabase;

  beforeEach(() => {
    db = new ServiceBotDatabase(":memory:");
  });
  afterEach(() => {
    db.close();
  });

  const webhooks: WebhookConfig[] = [
    { event: "task.completed", url: "https://example.com/hook" },
  ];

  it("dispatches webhook on matching event", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
    });

    const result = await dispatchWebhooks({
      event: "task.completed",
      eventId: "task-1",
      payload: { taskId: "task-1", status: "done" },
      subsidiaryId: "sub-1",
      webhooks,
      db,
      now: () => "2026-03-02T12:00:00Z",
      fetchFn: mockFetch,
    });

    expect(result.dispatched).toBe(1);
    expect(result.failed).toBe(0);
    expect(mockFetch).toHaveBeenCalledWith(
      "https://example.com/hook",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("skips non-matching events", async () => {
    const mockFetch = vi.fn();

    const result = await dispatchWebhooks({
      event: "booking.created",
      eventId: "booking-1",
      payload: {},
      subsidiaryId: "sub-1",
      webhooks,
      db,
      now: () => "2026-03-02T12:00:00Z",
      fetchFn: mockFetch,
    });

    expect(result.dispatched).toBe(0);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("records failed attempt with retry time", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
    });

    const result = await dispatchWebhooks({
      event: "task.completed",
      eventId: "task-2",
      payload: {},
      subsidiaryId: "sub-1",
      webhooks,
      db,
      now: () => "2026-03-02T12:00:00Z",
      fetchFn: mockFetch,
    });

    expect(result.dispatched).toBe(0);
    expect(result.failed).toBe(1);

    // Verify the attempt was persisted
    const retries = db.listPendingWebhookRetries("2026-03-02T12:05:00Z");
    expect(retries).toHaveLength(1);
    expect(retries[0].status).toBe("pending");
    expect(retries[0].errorMessage).toBe("HTTP 500");
  });

  it("handles fetch errors gracefully", async () => {
    const mockFetch = vi.fn().mockRejectedValue(new Error("Network error"));

    const result = await dispatchWebhooks({
      event: "task.completed",
      eventId: "task-3",
      payload: {},
      subsidiaryId: "sub-1",
      webhooks,
      db,
      now: () => "2026-03-02T12:00:00Z",
      fetchFn: mockFetch,
    });

    expect(result.dispatched).toBe(0);
    expect(result.failed).toBe(1);

    const retries = db.listPendingWebhookRetries("2026-03-02T12:05:00Z");
    expect(retries[0].errorMessage).toBe("Network error");
  });

  it("includes HMAC signature when secretEnv is set", async () => {
    process.env.TEST_WEBHOOK_SECRET = "mysecret";
    const signedWebhooks: WebhookConfig[] = [
      { event: "task.completed", url: "https://example.com/hook", secretEnv: "TEST_WEBHOOK_SECRET" },
    ];
    const mockFetch = vi.fn().mockResolvedValue({ ok: true, status: 200 });

    await dispatchWebhooks({
      event: "task.completed",
      eventId: "task-4",
      payload: { test: true },
      subsidiaryId: "sub-1",
      webhooks: signedWebhooks,
      db,
      now: () => "2026-03-02T12:00:00Z",
      fetchFn: mockFetch,
    });

    const callArgs = mockFetch.mock.calls[0][1];
    expect(callArgs.headers["X-Webhook-Signature"]).toBeDefined();
    expect(callArgs.headers["X-Webhook-Signature"]).toMatch(/^[0-9a-f]+$/);

    delete process.env.TEST_WEBHOOK_SECRET;
  });
});
