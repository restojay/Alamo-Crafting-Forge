import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdirSync, rmSync } from "fs";
import { resolve } from "path";
import { tmpdir } from "os";
import { randomBytes } from "crypto";
import { createHub, type Hub } from "../../src/hub/server.js";

describe("Hub HTTP Server", () => {
  let dataDir: string;
  let hub: Hub;
  let baseUrl: string;
  let portCounter = 17700 + Math.floor(Math.random() * 1000);

  beforeEach(async () => {
    const port = portCounter++;
    dataDir = resolve(tmpdir(), `openclaw-hub-${randomBytes(4).toString("hex")}`);
    mkdirSync(dataDir, { recursive: true });
    hub = await createHub({ dbPath: resolve(dataDir, "hub.sqlite"), port });
    baseUrl = `http://127.0.0.1:${port}`;
  });

  afterEach(async () => {
    await hub.stop();
    rmSync(dataDir, { recursive: true, force: true });
  });

  it("GET /api/status returns hub status", async () => {
    const resp = await fetch(`${baseUrl}/api/status`);
    const data = await resp.json();
    expect(data.hub).toBe("running");
    expect(data.active_sessions).toBe(0);
    expect(data.pending_approvals).toBe(0);
  });

  it("POST + GET /api/approvals lifecycle", async () => {
    const token = hub.token;

    // Create proposal
    const createResp = await fetch(`${baseUrl}/api/approvals`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        project: "Anvil",
        title: "Deploy v2",
        intent: "Ship changes",
        impact: "3 files",
        requested_by: "test",
      }),
    });
    expect(createResp.status).toBe(201);
    const { proposal } = await createResp.json();
    expect(proposal.status).toBe("pending");

    // List pending
    const listResp = await fetch(`${baseUrl}/api/approvals`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const { approvals } = await listResp.json();
    expect(approvals).toHaveLength(1);

    // Decide
    const decideResp = await fetch(`${baseUrl}/api/approvals/decide`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ proposal_id: proposal.id, decision: "approved", response: "LGTM" }),
    });
    expect(decideResp.status).toBe(200);
    const decided = await decideResp.json();
    expect(decided.proposal.status).toBe("approved");
  });

  it("GET /api/approvals/:id returns specific proposal", async () => {
    const token = hub.token;
    const createResp = await fetch(`${baseUrl}/api/approvals`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ project: "X", title: "T", intent: "I", impact: "M", requested_by: "t" }),
    });
    const { proposal } = await createResp.json();

    const getResp = await fetch(`${baseUrl}/api/approvals/${proposal.id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(getResp.status).toBe(200);
    const data = await getResp.json();
    expect(data.proposal.id).toBe(proposal.id);
  });

  it("rejects unauthenticated API requests", async () => {
    const resp = await fetch(`${baseUrl}/api/approvals`);
    expect(resp.status).toBe(401);
  });

  it("rejects malformed Authorization header", async () => {
    const resp = await fetch(`${baseUrl}/api/approvals`, {
      headers: { Authorization: "NotBearer token" },
    });
    expect(resp.status).toBe(401);
  });

  it("rejects wrong token", async () => {
    const resp = await fetch(`${baseUrl}/api/approvals`, {
      headers: { Authorization: "Bearer wrong-token-value" },
    });
    expect(resp.status).toBe(401);
  });

  it("rejects invalid event types on POST /api/events", async () => {
    const token = hub.token;
    const resp = await fetch(`${baseUrl}/api/events`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ type: "invalid.event", source: "test" }),
    });
    expect(resp.status).toBe(400);
    const data = await resp.json();
    expect(data.error).toContain("Invalid event type");
  });

  it("POST + GET /api/sessions lifecycle", async () => {
    const token = hub.token;

    const regResp = await fetch(`${baseUrl}/api/sessions/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ project: "Anvil", cwd: "/path", pid: 1234 }),
    });
    expect(regResp.status).toBe(201);

    const listResp = await fetch(`${baseUrl}/api/sessions`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const { sessions } = await listResp.json();
    expect(sessions).toHaveLength(1);
  });
});
