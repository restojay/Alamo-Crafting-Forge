import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { readFileSync, writeFileSync, mkdirSync, rmSync } from "fs";
import { resolve } from "path";
import { tmpdir } from "os";
import { randomBytes } from "crypto";

describe("Config", () => {
  let configDir: string;
  let configPath: string;

  beforeEach(() => {
    configDir = resolve(tmpdir(), `openclaw-test-${randomBytes(4).toString("hex")}`);
    mkdirSync(configDir, { recursive: true });
    configPath = resolve(configDir, "telegram-config.json");
    // Reset cached config between tests
    vi.resetModules();
  });

  afterEach(() => {
    rmSync(configDir, { recursive: true, force: true });
  });

  it("loads config from JSON file", async () => {
    writeFileSync(configPath, JSON.stringify({
      bot_token: "123:ABC",
      chat_id: "-100999",
      topics: { Anvil: 42, chat: 1 },
    }));

    const { loadConfig } = await import("../src/config.js");
    const config = loadConfig(configPath);
    expect(config.bot_token).toBe("123:ABC");
    expect(config.chat_id).toBe("-100999");
    expect(config.topics.Anvil).toBe(42);
  });

  it("env vars override file values", async () => {
    writeFileSync(configPath, JSON.stringify({
      bot_token: "file-token",
      chat_id: "-100999",
      topics: {},
    }));

    process.env.TELEGRAM_BOT_TOKEN = "env-token";
    const { loadConfig } = await import("../src/config.js");
    const config = loadConfig(configPath);
    expect(config.bot_token).toBe("env-token");
    delete process.env.TELEGRAM_BOT_TOKEN;
  });

  it("returns defaults when config file missing", async () => {
    const { loadConfig } = await import("../src/config.js");
    const config = loadConfig(resolve(configDir, "nonexistent.json"));
    expect(config.bot_token).toBe("");
    expect(config.hub_port).toBe(7700);
    expect(config.topics).toEqual({});
  });

  it("getChannelTopicId resolves named channels", async () => {
    writeFileSync(configPath, JSON.stringify({
      bot_token: "t",
      chat_id: "c",
      topics: { Anvil: 42, chat: 1 },
    }));

    const { loadConfig, getChannelTopicId } = await import("../src/config.js");
    loadConfig(configPath);
    expect(getChannelTopicId("Anvil")).toBe(42);
    expect(getChannelTopicId("unknown")).toBe(1); // falls back to chat
  });
});
