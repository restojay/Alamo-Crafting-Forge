import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdirSync, rmSync } from "fs";
import { resolve } from "path";
import { tmpdir } from "os";
import { randomBytes } from "crypto";
import { OpenClawDatabase } from "../../src/db/database.js";
import { createEventLog } from "../../src/hub/event-log.js";

describe("Event Log", () => {
  let dataDir: string;
  let db: OpenClawDatabase;
  let eventLog: ReturnType<typeof createEventLog>;

  beforeEach(() => {
    dataDir = resolve(tmpdir(), `openclaw-events-${randomBytes(4).toString("hex")}`);
    mkdirSync(dataDir, { recursive: true });
    db = new OpenClawDatabase(resolve(dataDir, "hub.sqlite"));
    eventLog = createEventLog(db);
  });

  afterEach(() => {
    db.close();
    rmSync(dataDir, { recursive: true, force: true });
  });

  it("appends an event and returns it with seq", () => {
    const event = eventLog.append("system.startup", "hub", null, { port: 7700 });
    expect(event.seq).toBeGreaterThan(0);
    expect(event.type).toBe("system.startup");
    expect(event.source).toBe("hub");
    expect(event.checksum).toBeTruthy();
  });

  it("retrieves events by type", () => {
    eventLog.append("system.startup", "hub", null, {});
    eventLog.append("approval.requested", "gate", "Anvil", { title: "test" });
    eventLog.append("system.shutdown", "hub", null, {});

    const approvals = eventLog.getEvents({ type: "approval.requested" });
    expect(approvals).toHaveLength(1);
    expect(approvals[0].project).toBe("Anvil");
  });

  it("retrieves events by project", () => {
    eventLog.append("approval.requested", "gate", "Anvil", {});
    eventLog.append("approval.requested", "gate", "Launch Control", {});

    const events = eventLog.getEvents({ project: "Anvil" });
    expect(events).toHaveLength(1);
  });

  it("limits results", () => {
    for (let i = 0; i < 10; i++) {
      eventLog.append("session.heartbeat", "s1", null, {});
    }
    const events = eventLog.getEvents({ limit: 3 });
    expect(events).toHaveLength(3);
  });

  it("computes checksum for integrity", () => {
    const e1 = eventLog.append("system.startup", "hub", null, {});
    const e2 = eventLog.append("system.shutdown", "hub", null, {});
    expect(e1.checksum).not.toBe(e2.checksum);
  });

  it("rejects invalid event types", () => {
    expect(() => eventLog.append("invalid.event" as any, "hub", null, {}))
      .toThrow(/Invalid event type/);
  });
});
