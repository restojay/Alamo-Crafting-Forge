import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock processNewEmails
const mockProcess = vi.fn().mockResolvedValue({ processed: 0, skipped: 0, unmatched: 0, errors: 0, errorDetails: [] });
vi.mock("../src/index", () => ({ processNewEmails: (...args: unknown[]) => mockProcess(...args) }));

import { runPoller } from "../src/poller";

describe("runPoller", () => {
  beforeEach(() => { vi.useFakeTimers(); mockProcess.mockClear(); });
  afterEach(() => { vi.useRealTimers(); });

  it("calls processNewEmails immediately on start", async () => {
    const poller = runPoller({
      db: {} as never,
      configs: [],
      claude: {} as never,
      fetchMessages: vi.fn().mockResolvedValue([]),
      intervalMs: 60_000,
    });

    // Allow the immediate tick to run
    await vi.advanceTimersByTimeAsync(0);
    expect(mockProcess).toHaveBeenCalledTimes(1);
    poller.stop();
  });

  it("calls processNewEmails again after interval", async () => {
    const poller = runPoller({
      db: {} as never,
      configs: [],
      claude: {} as never,
      fetchMessages: vi.fn().mockResolvedValue([]),
      intervalMs: 5_000,
    });

    await vi.advanceTimersByTimeAsync(0);
    expect(mockProcess).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(5_000);
    expect(mockProcess).toHaveBeenCalledTimes(2);
    poller.stop();
  });

  it("prevents overlapping execution if tick is still running", async () => {
    let resolveProcess: (() => void) | undefined;
    mockProcess.mockImplementation(() => new Promise<void>((r) => { resolveProcess = r; }));

    const poller = runPoller({
      db: {} as never,
      configs: [],
      claude: {} as never,
      fetchMessages: vi.fn().mockResolvedValue([]),
      intervalMs: 1_000,
    });

    await vi.advanceTimersByTimeAsync(0);
    expect(mockProcess).toHaveBeenCalledTimes(1);

    // Interval fires while first tick still running
    await vi.advanceTimersByTimeAsync(1_000);
    expect(mockProcess).toHaveBeenCalledTimes(1); // still 1 — guard prevented overlap

    resolveProcess!();
    await vi.advanceTimersByTimeAsync(0);

    await vi.advanceTimersByTimeAsync(1_000);
    expect(mockProcess).toHaveBeenCalledTimes(2); // now runs again
    poller.stop();
  });

  it("stop() prevents further calls", async () => {
    const poller = runPoller({
      db: {} as never,
      configs: [],
      claude: {} as never,
      fetchMessages: vi.fn().mockResolvedValue([]),
      intervalMs: 1_000,
    });

    await vi.advanceTimersByTimeAsync(0);
    poller.stop();

    await vi.advanceTimersByTimeAsync(5_000);
    expect(mockProcess).toHaveBeenCalledTimes(1);
  });
});
