import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mkdirSync, rmSync, writeFileSync } from "fs";
import { resolve } from "path";
import { tmpdir } from "os";
import { randomBytes } from "crypto";
import { createHub, type Hub } from "../../src/hub/server.js";
import { awaitDecision } from "../../src/cli/await-decision.js";

describe("E2E: Approval Flow", () => {
  let dataDir: string;
  let hub: Hub;
  let port: number;
  let configPath: string;
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    dataDir = resolve(tmpdir(), `openclaw-e2e-${randomBytes(4).toString("hex")}`);
    mkdirSync(dataDir, { recursive: true });
    port = 19700 + Math.floor(Math.random() * 1000);

    configPath = resolve(dataDir, "config.json");
    writeFileSync(configPath, JSON.stringify({
      bot_token: "test", chat_id: "-100", topics: { actions: 1 },
    }));

    // Mock fetch for Telegram API calls only (let Hub calls go through)
    const originalFetch = globalThis.fetch;
    fetchMock = vi.fn((url: string, init?: RequestInit) => {
      if (typeof url === "string" && url.includes("api.telegram.org")) {
        return Promise.resolve({
          json: () => Promise.resolve({ ok: true, result: { message_id: 999 } }),
          status: 200,
        } as Response);
      }
      return originalFetch(url, init);
    });
    vi.stubGlobal("fetch", fetchMock);

    hub = await createHub({
      dbPath: resolve(dataDir, "hub.sqlite"),
      port,
      configPath,
      logFile: resolve(dataDir, "log.md"),
    });
  });

  afterEach(async () => {
    vi.unstubAllGlobals();
    await hub.stop();
    rmSync(dataDir, { recursive: true, force: true });
  });

  it("full flow: create proposal → delivery loop sends Telegram → CEO decides → poll returns approved", async () => {
    const decisionPromise = awaitDecision({
      project: "Anvil",
      title: "Deploy v2",
      intent: "Ship latest changes",
      impact: "3 files modified",
      hubUrl: `http://127.0.0.1:${port}`,
      hubToken: hub.token,
      pollTimeoutMs: 10_000,
    });

    // Wait for proposal to be created
    await new Promise((r) => setTimeout(r, 500));

    // CEO approves via Hub API
    const listResp = await fetch(`http://127.0.0.1:${port}/api/approvals`, {
      headers: { Authorization: `Bearer ${hub.token}` },
    });
    const { approvals } = await listResp.json() as { approvals: { id: string }[] };
    expect(approvals).toHaveLength(1);

    await fetch(`http://127.0.0.1:${port}/api/approvals/decide`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${hub.token}` },
      body: JSON.stringify({ proposal_id: approvals[0].id, decision: "approved", response: "Ship it" }),
    });

    const result = await decisionPromise;
    expect(result.status).toBe("approved");
    expect(result.response).toBe("Ship it");
  });

  it("full flow: create proposal → CEO rejects → poll returns rejected", async () => {
    const decisionPromise = awaitDecision({
      project: "Anvil",
      title: "Risky Deploy",
      intent: "Deploy untested",
      impact: "Production",
      hubUrl: `http://127.0.0.1:${port}`,
      hubToken: hub.token,
      pollTimeoutMs: 10_000,
    });

    await new Promise((r) => setTimeout(r, 500));

    const listResp = await fetch(`http://127.0.0.1:${port}/api/approvals`, {
      headers: { Authorization: `Bearer ${hub.token}` },
    });
    const { approvals } = await listResp.json() as { approvals: { id: string }[] };

    await fetch(`http://127.0.0.1:${port}/api/approvals/decide`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${hub.token}` },
      body: JSON.stringify({ proposal_id: approvals[0].id, decision: "rejected", response: "Not ready" }),
    });

    const result = await decisionPromise;
    expect(result.status).toBe("rejected");
    expect(result.response).toBe("Not ready");
  });
});
