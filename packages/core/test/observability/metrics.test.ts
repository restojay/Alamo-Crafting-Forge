import { describe, it, expect } from "vitest";
import { createMetrics } from "../../src/observability/metrics.js";

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

  it("tracks multiple counters independently", () => {
    const m = createMetrics();
    m.increment("emails_processed");
    m.increment("tasks_created");
    m.increment("tasks_created");
    m.increment("drafts_sent");

    const snap = m.snapshot();
    expect(snap.emails_processed).toBe(1);
    expect(snap.tasks_created).toBe(2);
    expect(snap.drafts_sent).toBe(1);
    expect(snap.webhooks_delivered).toBe(0);
  });

  it("returns all known counters even if not incremented", () => {
    const m = createMetrics();
    const snap = m.snapshot();
    expect(snap).toHaveProperty("emails_processed", 0);
    expect(snap).toHaveProperty("tasks_created", 0);
    expect(snap).toHaveProperty("drafts_sent", 0);
    expect(snap).toHaveProperty("webhooks_delivered", 0);
  });
});
