import { randomUUID } from "crypto";
import type { OpenClawDatabase } from "../db/database.js";
import type { EventLog } from "./event-log.js";
import type { SessionState } from "@openclaw/protocol-qa";

export function createSessions(db: OpenClawDatabase, eventLog: EventLog) {
  function nowEpoch(): number {
    return Math.floor(Date.now() / 1000);
  }

  function register(project: string, cwd: string, pid: number, id?: string): SessionState {
    const sessionId = id || `session:${randomUUID().slice(0, 8)}`;
    const now = nowEpoch();
    const nowIso = new Date().toISOString();

    const session: SessionState = {
      id: sessionId,
      pid,
      project,
      cwd,
      started_at: nowIso,
      last_heartbeat: nowIso,
      status: "active",
      last_activity: "Starting",
    };

    db.raw.prepare(`
      INSERT INTO sessions (id, pid, project, cwd, started_at, last_heartbeat, last_heartbeat_epoch, status, last_activity)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(sessionId, pid, project, cwd, nowIso, nowIso, now, "active", "Starting");

    eventLog.append("session.started", sessionId, project, { pid, cwd });
    return session;
  }

  function heartbeat(sessionId: string, activity?: string): boolean {
    const now = nowEpoch();
    const nowIso = new Date().toISOString();
    const result = db.raw.prepare(`
      UPDATE sessions SET last_heartbeat = ?, last_heartbeat_epoch = ?, last_activity = COALESCE(?, last_activity)
      WHERE id = ? AND status IN ('active', 'idle')
    `).run(nowIso, now, activity || null, sessionId);
    return result.changes > 0;
  }

  function end(sessionId: string): boolean {
    const result = db.raw.prepare(`
      UPDATE sessions SET status = 'dead' WHERE id = ?
    `).run(sessionId);

    if (result.changes > 0) {
      const session = get(sessionId);
      eventLog.append("session.ended", sessionId, session?.project ?? null, {});
    }
    return result.changes > 0;
  }

  function get(sessionId: string): SessionState | null {
    return (db.raw.prepare("SELECT * FROM sessions WHERE id = ?").get(sessionId) as SessionState) ?? null;
  }

  function getActive(): SessionState[] {
    return db.raw.prepare("SELECT * FROM sessions WHERE status IN ('active', 'idle') ORDER BY started_at DESC")
      .all() as SessionState[];
  }

  function getByProject(project: string): SessionState | null {
    return (db.raw.prepare("SELECT * FROM sessions WHERE project = ? AND status IN ('active', 'idle') ORDER BY started_at DESC LIMIT 1")
      .get(project) as SessionState) ?? null;
  }

  function reapDead(timeoutSeconds: number): number {
    const cutoff = nowEpoch() - timeoutSeconds;
    const result = db.raw.prepare(`
      UPDATE sessions SET status = 'dead'
      WHERE status IN ('active', 'idle')
      AND last_heartbeat_epoch < ?
    `).run(cutoff);
    return result.changes;
  }

  return { register, heartbeat, end, get, getActive, getByProject, reapDead };
}

export type Sessions = ReturnType<typeof createSessions>;
