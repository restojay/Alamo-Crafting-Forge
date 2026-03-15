import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdirSync, rmSync } from "fs";
import { resolve } from "path";
import { tmpdir } from "os";
import { randomBytes } from "crypto";
import { OpenClawDatabase } from "../../src/db/database.js";
import { createEventLog } from "../../src/hub/event-log.js";
import { createSessions } from "../../src/hub/sessions.js";

describe("Sessions", () => {
  let dataDir: string;
  let db: OpenClawDatabase;
  let sessions: ReturnType<typeof createSessions>;

  beforeEach(() => {
    dataDir = resolve(tmpdir(), `openclaw-sessions-${randomBytes(4).toString("hex")}`);
    mkdirSync(dataDir, { recursive: true });
    db = new OpenClawDatabase(resolve(dataDir, "hub.sqlite"));
    const eventLog = createEventLog(db);
    sessions = createSessions(db, eventLog);
  });

  afterEach(() => {
    db.close();
    rmSync(dataDir, { recursive: true, force: true });
  });

  it("registers a new session", () => {
    const s = sessions.register("Anvil", "/path/to/anvil", 1234);
    expect(s.id).toBeTruthy();
    expect(s.project).toBe("Anvil");
    expect(s.status).toBe("active");
  });

  it("sends heartbeat", () => {
    const s = sessions.register("Anvil", "/path", 1234);
    const ok = sessions.heartbeat(s.id, "Running tests");
    expect(ok).toBe(true);
  });

  it("ends a session", () => {
    const s = sessions.register("Anvil", "/path", 1234);
    const ok = sessions.end(s.id);
    expect(ok).toBe(true);

    const active = sessions.getActive();
    expect(active).toHaveLength(0);
  });

  it("lists active sessions", () => {
    sessions.register("Anvil", "/a", 1);
    sessions.register("Launch Control", "/b", 2);
    const s3 = sessions.register("MailBridge", "/c", 3);
    sessions.end(s3.id);

    expect(sessions.getActive()).toHaveLength(2);
  });

  it("reaps dead sessions", () => {
    const s = sessions.register("Anvil", "/a", 1);
    // Manually backdate the heartbeat epoch to 5 minutes ago
    const fiveMinAgo = Math.floor(Date.now() / 1000) - 300;
    db.raw.prepare("UPDATE sessions SET last_heartbeat_epoch = ?").run(fiveMinAgo);
    const reaped = sessions.reapDead(120); // 2-minute timeout
    expect(reaped).toBeGreaterThan(0);
  });
});
