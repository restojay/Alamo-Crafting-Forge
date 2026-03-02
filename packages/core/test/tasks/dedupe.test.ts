import { describe, it, expect } from "vitest";
import { computeDedupeHash } from "../../src/tasks/dedupe.js";

describe("computeDedupeHash", () => {
  it("returns a 16-character hex string", () => {
    const hash = computeDedupeHash("sub-1", "Weekly report", "recurring");
    expect(hash).toHaveLength(16);
    expect(hash).toMatch(/^[0-9a-f]{16}$/);
  });

  it("is deterministic for same inputs", () => {
    const a = computeDedupeHash("sub-1", "Weekly report", "recurring");
    const b = computeDedupeHash("sub-1", "Weekly report", "recurring");
    expect(a).toBe(b);
  });

  it("avoids delimiter collision across field boundaries", () => {
    const hashA = computeDedupeHash("a:b", "c", "d");
    const hashB = computeDedupeHash("a", "b:c", "d");
    expect(hashA).not.toBe(hashB);
  });

  it("differs when any input changes", () => {
    const base = computeDedupeHash("sub-1", "Weekly report", "recurring");
    const diffSub = computeDedupeHash("sub-2", "Weekly report", "recurring");
    const diffDesc = computeDedupeHash("sub-1", "Monthly report", "recurring");
    const diffCat = computeDedupeHash("sub-1", "Weekly report", "support");

    expect(base).not.toBe(diffSub);
    expect(base).not.toBe(diffDesc);
    expect(base).not.toBe(diffCat);
  });
});
