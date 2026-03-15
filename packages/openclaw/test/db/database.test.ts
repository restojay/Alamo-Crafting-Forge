import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdirSync, rmSync } from "fs";
import { resolve } from "path";
import { tmpdir } from "os";
import { randomBytes } from "crypto";
import { OpenClawDatabase } from "../../src/db/database.js";

describe("OpenClawDatabase", () => {
  let dataDir: string;
  let db: OpenClawDatabase;

  beforeEach(() => {
    dataDir = resolve(tmpdir(), `openclaw-db-${randomBytes(4).toString("hex")}`);
    mkdirSync(dataDir, { recursive: true });
    db = new OpenClawDatabase(resolve(dataDir, "hub.sqlite"));
  });

  afterEach(() => {
    db.close();
    rmSync(dataDir, { recursive: true, force: true });
  });

  it("creates database with WAL mode", () => {
    const mode = db.raw.pragma("journal_mode", { simple: true });
    expect(mode).toBe("wal");
  });

  it("runs migrations and creates tables", () => {
    const tables = db.raw
      .prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
      .all() as { name: string }[];
    const names = tables.map((t) => t.name);
    expect(names).toContain("events");
    expect(names).toContain("sessions");
    expect(names).toContain("approvals");
    expect(names).toContain("policy_decisions");
    expect(names).toContain("actions");
    expect(names).toContain("schema_version");
  });

  it("reports current schema version", () => {
    expect(db.schemaVersion()).toBeGreaterThanOrEqual(1);
  });

  it("is idempotent — reopening runs no duplicate migrations", () => {
    db.close();
    const db2 = new OpenClawDatabase(resolve(dataDir, "hub.sqlite"));
    expect(db2.schemaVersion()).toBeGreaterThanOrEqual(1);
    db2.close();
  });
});
