import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mkdirSync, rmSync, writeFileSync } from "fs";
import { resolve } from "path";
import { tmpdir } from "os";
import { randomBytes } from "crypto";

describe("Notify", () => {
  let configDir: string;
  let configPath: string;
  let logFile: string;
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    configDir = resolve(tmpdir(), `openclaw-notify-${randomBytes(4).toString("hex")}`);
    mkdirSync(configDir, { recursive: true });
    configPath = resolve(configDir, "config.json");
    logFile = resolve(configDir, "log.md");

    writeFileSync(configPath, JSON.stringify({
      bot_token: "test-token",
      chat_id: "-100999",
      topics: { Anvil: 42, chat: 1 },
    }));

    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    rmSync(configDir, { recursive: true, force: true });
  });

  it("sendText sends message to correct topic", async () => {
    fetchMock.mockResolvedValueOnce({
      json: () => Promise.resolve({ ok: true, result: { message_id: 123 } }),
      status: 200,
    });

    const { createNotifier } = await import("../src/notify.js");
    const { sendText } = createNotifier(configPath, logFile);
    const result = await sendText("Anvil", "Build complete");

    expect(result).toBe(123);
    expect(fetchMock).toHaveBeenCalledOnce();
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.chat_id).toBe("-100999");
    expect(body.message_thread_id).toBe(42);
    expect(body.text).toBe("Build complete");
  });

  it("sendApproval includes inline keyboard", async () => {
    fetchMock.mockResolvedValueOnce({
      json: () => Promise.resolve({ ok: true }),
      status: 200,
    });

    const { createNotifier } = await import("../src/notify.js");
    const { sendApproval } = createNotifier(configPath, logFile);
    const result = await sendApproval("Anvil", "Ready for review", "qa-123");

    expect(result).toBe(true);
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.reply_markup.inline_keyboard[0]).toHaveLength(3);
    expect(body.reply_markup.inline_keyboard[0][0].callback_data).toBe("approve:qa-123");
    expect(body.reply_markup.inline_keyboard[0][1].callback_data).toBe("reject:qa-123");
    expect(body.reply_markup.inline_keyboard[0][2].callback_data).toBe("comment:qa-123");
  });

  it("sendText falls back to plain text on Markdown parse error", async () => {
    fetchMock
      .mockResolvedValueOnce({
        json: () => Promise.resolve({ ok: false, description: "Bad Request: can't parse" }),
        status: 400,
      })
      .mockResolvedValueOnce({
        json: () => Promise.resolve({ ok: true, result: { message_id: 456 } }),
        status: 200,
      });

    const { createNotifier } = await import("../src/notify.js");
    const { sendText } = createNotifier(configPath, logFile);
    const result = await sendText("chat", "test *broken markdown");

    expect(result).toBe(456);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    // Second call should NOT have parse_mode
    const secondBody = JSON.parse(fetchMock.mock.calls[1][1].body);
    expect(secondBody.parse_mode).toBeUndefined();
  });

  it("sendText returns null on failure", async () => {
    fetchMock.mockRejectedValue(new Error("Network error"));

    const { createNotifier } = await import("../src/notify.js");
    const { sendText } = createNotifier(configPath, logFile);
    const result = await sendText("chat", "test");

    expect(result).toBeNull();
  });
});
