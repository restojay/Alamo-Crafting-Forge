import { describe, it, expect } from "vitest";
import {
  QA_EVENT_TYPES,
  isQaEvent,
  type QaEventType,
} from "../src/events.js";

describe("QA Event Types", () => {
  it("defines all gateway event types", () => {
    expect(QA_EVENT_TYPES).toContain("approval.requested");
    expect(QA_EVENT_TYPES).toContain("approval.decided");
    expect(QA_EVENT_TYPES).toContain("session.started");
    expect(QA_EVENT_TYPES).toContain("session.ended");
    expect(QA_EVENT_TYPES).toContain("session.heartbeat");
    expect(QA_EVENT_TYPES).toContain("system.startup");
    expect(QA_EVENT_TYPES).toContain("system.shutdown");
  });

  it("type guard accepts valid event types", () => {
    expect(isQaEvent("approval.requested")).toBe(true);
    expect(isQaEvent("approval.decided")).toBe(true);
    expect(isQaEvent("session.started")).toBe(true);
  });

  it("type guard rejects invalid event types", () => {
    expect(isQaEvent("invalid.event")).toBe(false);
    expect(isQaEvent("")).toBe(false);
    expect(isQaEvent(42)).toBe(false);
  });
});
