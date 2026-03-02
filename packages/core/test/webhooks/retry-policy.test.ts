import { describe, it, expect } from "vitest";
import { nextDelayMs, MAX_ATTEMPTS } from "../../src/webhooks/retry-policy.js";

describe("retryPolicy", () => {
  it("returns exponential backoff delays", () => {
    expect(nextDelayMs(1, 1000, 60000)).toBe(1000);
    expect(nextDelayMs(2, 1000, 60000)).toBe(2000);
    expect(nextDelayMs(3, 1000, 60000)).toBe(4000);
    expect(nextDelayMs(4, 1000, 60000)).toBe(8000);
  });

  it("caps at max delay", () => {
    expect(nextDelayMs(10, 1000, 60000)).toBe(60000);
    expect(nextDelayMs(20, 1000, 60000)).toBe(60000);
  });

  it("exports MAX_ATTEMPTS constant", () => {
    expect(MAX_ATTEMPTS).toBe(5);
  });
});
