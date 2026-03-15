import { createHash } from "crypto";
import type { OpenClawDatabase } from "../db/database.js";
import { isQaEvent, QA_EVENT_TYPES, type QaEventType, type QaEvent } from "@openclaw/protocol-qa";

interface GetEventsOptions {
  type?: string;
  project?: string;
  afterSeq?: number;
  beforeSeq?: number;
  limit?: number;
}

export function createEventLog(db: OpenClawDatabase) {
  const insertStmt = db.raw.prepare(`
    INSERT INTO events (timestamp, type, source, project, payload, checksum, schema_version)
    VALUES (?, ?, ?, ?, ?, ?, 1)
  `);

  function computeChecksum(type: string, source: string, project: string | null, payload: string, timestamp: string): string {
    return createHash("sha256")
      .update(`${type}:${source}:${project ?? ""}:${payload}:${timestamp}`)
      .digest("hex")
      .slice(0, 16);
  }

  function append(
    type: QaEventType | string,
    source: string,
    project: string | null,
    data: Record<string, unknown>
  ): QaEvent {
    if (!isQaEvent(type)) {
      throw new Error(`Invalid event type: "${type}". Must be one of: ${QA_EVENT_TYPES.join(", ")}`);
    }
    const timestamp = new Date().toISOString();
    const payload = JSON.stringify(data);
    const checksum = computeChecksum(type, source, project, payload, timestamp);

    const result = insertStmt.run(timestamp, type, source, project, payload, checksum);

    return {
      seq: result.lastInsertRowid as number,
      timestamp,
      type: type as QaEventType,
      source,
      project,
      payload,
      checksum,
      schema_version: 1,
    };
  }

  function getEvents(opts: GetEventsOptions = {}): QaEvent[] {
    const conditions: string[] = [];
    const params: unknown[] = [];

    if (opts.type) {
      conditions.push("type = ?");
      params.push(opts.type);
    }
    if (opts.project) {
      conditions.push("project = ?");
      params.push(opts.project);
    }
    if (opts.afterSeq !== undefined) {
      conditions.push("seq > ?");
      params.push(opts.afterSeq);
    }
    if (opts.beforeSeq !== undefined) {
      conditions.push("seq < ?");
      params.push(opts.beforeSeq);
    }

    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    const limit = opts.limit ?? 50;

    return db.raw
      .prepare(`SELECT * FROM events ${where} ORDER BY seq DESC LIMIT ?`)
      .all(...params, limit) as QaEvent[];
  }

  function getLatestEvent(type: string, project?: string): QaEvent | null {
    if (project) {
      return (db.raw
        .prepare("SELECT * FROM events WHERE type = ? AND project = ? ORDER BY seq DESC LIMIT 1")
        .get(type, project) as QaEvent) ?? null;
    }
    return (db.raw
      .prepare("SELECT * FROM events WHERE type = ? ORDER BY seq DESC LIMIT 1")
      .get(type) as QaEvent) ?? null;
  }

  return { append, getEvents, getLatestEvent };
}

export type EventLog = ReturnType<typeof createEventLog>;
