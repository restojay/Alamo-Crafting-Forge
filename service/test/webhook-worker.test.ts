import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { processWebhookRetries } from "../src/webhook-worker.js";
import { ServiceBotDatabase } from "@servicebot/core";
import type { WebhookAttempt } from "@servicebot/core";

function makePendingAttempt(db: ServiceBotDatabase, overrides: Partial<WebhookAttempt> = {}): void {
  db.insertWebhookAttempt({
    id: "wa-1",
    subsidiaryId: "sub-1",
    eventType: "task.completed",
    eventId: "task-1",
    url: "https://example.com/hook",
    status: "pending",
    attempt: 1,
    errorMessage: "HTTP 500",
    nextRetryAt: "2026-03-02T12:00:00Z",
    createdAt: "2026-03-02T11:59:00Z",
    ...overrides,
  });
}

describe("processWebhookRetries", () => {
  let db: ServiceBotDatabase;

  beforeEach(() => {
    db = new ServiceBotDatabase(":memory:");
  });
  afterEach(() => {
    db.close();
  });

  it("delivers pending retry on success", async () => {
    makePendingAttempt(db);
    const mockFetch = vi.fn().mockResolvedValue({ ok: true, status: 200 });

    const result = await processWebhookRetries({
      db,
      now: () => "2026-03-02T12:01:00Z",
      fetchFn: mockFetch,
    });

    expect(result.processed).toBe(1);
    expect(result.delivered).toBe(1);
    expect(result.failed).toBe(0);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("records failure with next retry on non-ok response", async () => {
    makePendingAttempt(db);
    const mockFetch = vi.fn().mockResolvedValue({ ok: false, status: 503 });

    const result = await processWebhookRetries({
      db,
      now: () => "2026-03-02T12:01:00Z",
      fetchFn: mockFetch,
    });

    expect(result.processed).toBe(1);
    expect(result.failed).toBe(1);
    expect(result.delivered).toBe(0);
  });

  it("marks exhausted after max attempts", async () => {
    makePendingAttempt(db, { attempt: 4 });
    const mockFetch = vi.fn().mockResolvedValue({ ok: false, status: 500 });

    const result = await processWebhookRetries({
      db,
      now: () => "2026-03-02T12:01:00Z",
      fetchFn: mockFetch,
    });

    expect(result.processed).toBe(1);
    expect(result.exhausted).toBe(1);
    expect(result.failed).toBe(0);
  });

  it("returns empty result when no retries pending", async () => {
    const result = await processWebhookRetries({
      db,
      now: () => "2026-03-02T12:01:00Z",
      fetchFn: vi.fn(),
    });

    expect(result.processed).toBe(0);
    expect(result.delivered).toBe(0);
  });
});
