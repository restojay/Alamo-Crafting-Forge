import { describe, it, expect } from "vitest";
import {
  transition,
  isValidTransition,
} from "../../src/tasks/state-machine.js";

describe("state-machine", () => {
  it("allows new -> in_progress", () => {
    expect(isValidTransition("new", "in_progress")).toBe(true);
  });

  it("allows in_progress -> awaiting_response", () => {
    expect(isValidTransition("in_progress", "awaiting_response")).toBe(true);
  });

  it("allows awaiting_response -> done", () => {
    expect(isValidTransition("awaiting_response", "done")).toBe(true);
  });

  it("allows escalation from any non-terminal state", () => {
    expect(isValidTransition("new", "escalated")).toBe(true);
    expect(isValidTransition("in_progress", "escalated")).toBe(true);
    expect(isValidTransition("awaiting_response", "escalated")).toBe(true);
  });

  it("rejects invalid transitions", () => {
    expect(isValidTransition("done", "new")).toBe(false);
    expect(isValidTransition("escalated", "new")).toBe(false);
    expect(isValidTransition("new", "done")).toBe(false);
  });

  it("transition() returns the target state on valid transition", () => {
    expect(transition("new", "in_progress")).toBe("in_progress");
  });

  it("transition() throws on invalid transition", () => {
    expect(() => transition("done", "new")).toThrow(
      "Invalid state transition: done -> new",
    );
  });
});
