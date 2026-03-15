import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdirSync, rmSync } from "fs";
import { resolve } from "path";
import { tmpdir } from "os";
import { randomBytes } from "crypto";
import { createHub, type Hub } from "../../src/hub/server.js";
import { awaitDecision, type AwaitDecisionArgs } from "../../src/cli/await-decision.js";

describe("await-decision", () => {
  let dataDir: string;
  let hub: Hub;
  let port: number;

  beforeEach(async () => {
    dataDir = resolve(tmpdir(), `openclaw-await-${randomBytes(4).toString("hex")}`);
    mkdirSync(dataDir, { recursive: true });
    port = 18700 + Math.floor(Math.random() * 1000);
    hub = await createHub({ dbPath: resolve(dataDir, "hub.sqlite"), port });
  });

  afterEach(async () => {
    await hub.stop();
    rmSync(dataDir, { recursive: true, force: true });
  });

  it("creates a Hub proposal", async () => {
    const result = await awaitDecision({
      project: "Anvil",
      title: "Deploy v2",
      intent: "Ship",
      impact: "3 files",
      hubUrl: `http://127.0.0.1:${port}`,
      hubToken: hub.token,
      pollTimeoutMs: 100, // Short timeout for test
    });

    // Should timeout since nobody decided
    expect(result.status).toBe("timeout");
    expect(result.proposalId).toMatch(/^proposal:/);
  });

  it("detects pre-existing approved proposal", async () => {
    // Pre-create and approve a proposal via Hub API
    const createResp = await fetch(`http://127.0.0.1:${port}/api/approvals`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${hub.token}` },
      body: JSON.stringify({
        project: "Anvil", title: "Deploy v2", intent: "Ship", impact: "3 files", requested_by: "test",
      }),
    });
    const { proposal } = await createResp.json();

    await fetch(`http://127.0.0.1:${port}/api/approvals/decide`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${hub.token}` },
      body: JSON.stringify({ proposal_id: proposal.id, decision: "approved", response: "ok" }),
    });

    const result = await awaitDecision({
      project: "Anvil",
      title: "Deploy v2",
      intent: "Ship",
      impact: "3 files",
      hubUrl: `http://127.0.0.1:${port}`,
      hubToken: hub.token,
      pollTimeoutMs: 5000,
      existingProposalId: proposal.id,
    });

    expect(result.status).toBe("approved");
  });
});
