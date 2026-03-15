import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mkdirSync, rmSync, writeFileSync } from "fs";
import { resolve } from "path";
import { tmpdir } from "os";
import { randomBytes } from "crypto";
import { OpenClawDatabase } from "../../src/db/database.js";
import { createEventLog } from "../../src/hub/event-log.js";
import { createApprovals } from "../../src/hub/approvals.js";
import { createDeliveryLoop } from "../../src/hub/delivery.js";

describe("Delivery Loop", () => {
  let dataDir: string;
  let db: OpenClawDatabase;
  let approvals: ReturnType<typeof createApprovals>;
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    dataDir = resolve(tmpdir(), `openclaw-delivery-${randomBytes(4).toString("hex")}`);
    mkdirSync(dataDir, { recursive: true });
    db = new OpenClawDatabase(resolve(dataDir, "hub.sqlite"));
    const eventLog = createEventLog(db);
    approvals = createApprovals(db, eventLog);
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    db.close();
    vi.unstubAllGlobals();
    rmSync(dataDir, { recursive: true, force: true });
  });

  it("delivers pending proposals to Telegram", async () => {
    fetchMock.mockResolvedValue({
      json: () => Promise.resolve({ ok: true }),
      status: 200,
    });

    const configPath = resolve(dataDir, "config.json");
    writeFileSync(configPath, JSON.stringify({
      bot_token: "test", chat_id: "-100", topics: { actions: 1 },
    }));

    approvals.create("Anvil", "Deploy v2", "Ship", "3 files", "gate");

    const deliver = createDeliveryLoop(approvals, db, configPath, resolve(dataDir, "log.md"));
    const delivered = await deliver.tick();

    expect(delivered).toBe(1);
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it("skips already-delivered proposals (persisted across instances)", async () => {
    fetchMock.mockResolvedValue({
      json: () => Promise.resolve({ ok: true }),
      status: 200,
    });

    const configPath = resolve(dataDir, "config.json");
    writeFileSync(configPath, JSON.stringify({
      bot_token: "test", chat_id: "-100", topics: { actions: 1 },
    }));

    approvals.create("Anvil", "Deploy v2", "Ship", "3 files", "gate");

    const deliver1 = createDeliveryLoop(approvals, db, configPath, resolve(dataDir, "log.md"));
    await deliver1.tick();

    // Simulate restart — new delivery loop instance, same DB
    const deliver2 = createDeliveryLoop(approvals, db, configPath, resolve(dataDir, "log.md"));
    const secondRun = await deliver2.tick();

    expect(secondRun).toBe(0);
  });
});
