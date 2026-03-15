import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { readFileSync, mkdirSync, rmSync, existsSync } from "fs";
import { resolve } from "path";
import { tmpdir } from "os";
import { randomBytes } from "crypto";
import { createLogger } from "../src/logger.js";

describe("Logger", () => {
  let logDir: string;
  let logFile: string;

  beforeEach(() => {
    logDir = resolve(tmpdir(), `openclaw-log-${randomBytes(4).toString("hex")}`);
    mkdirSync(logDir, { recursive: true });
    logFile = resolve(logDir, "telegram-log.md");
  });

  afterEach(() => {
    rmSync(logDir, { recursive: true, force: true });
  });

  it("creates log file with header on first write", () => {
    const log = createLogger(logFile);
    log("chat", "text", "delivered");
    expect(existsSync(logFile)).toBe(true);
    const content = readFileSync(logFile, "utf-8");
    expect(content).toContain("| Timestamp | Thread | Type | Status | Details |");
  });

  it("appends log entries with pipe-separated fields", () => {
    const log = createLogger(logFile);
    log("Anvil", "approval_request", "delivered", "qa-123");
    const content = readFileSync(logFile, "utf-8");
    expect(content).toContain("| Anvil |");
    expect(content).toContain("| approval_request |");
    expect(content).toContain("| delivered |");
    expect(content).toContain("| qa-123 |");
  });

  it("appends multiple entries", () => {
    const log = createLogger(logFile);
    log("chat", "text", "delivered");
    log("actions", "approval_request", "failed", "timeout");
    const lines = readFileSync(logFile, "utf-8").split("\n").filter(l => l.startsWith("|"));
    // Header + separator + 2 entries = 4 pipe lines
    expect(lines.length).toBe(4);
  });
});
