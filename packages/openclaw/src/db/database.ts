import Database from "better-sqlite3";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = resolve(__dirname, "migrations");

export class OpenClawDatabase {
  readonly raw: Database.Database;

  constructor(dbPath: string) {
    this.raw = new Database(dbPath);
    this.raw.pragma("journal_mode = WAL");
    this.raw.pragma("synchronous = NORMAL");
    this.raw.pragma("foreign_keys = ON");
    this.migrate();
  }

  private migrate(): void {
    this.raw.exec(`
      CREATE TABLE IF NOT EXISTS schema_version (
        version INTEGER PRIMARY KEY
      );
    `);

    const current = this.raw
      .prepare("SELECT MAX(version) as v FROM schema_version")
      .get() as { v: number | null };
    const version = current?.v ?? 0;

    if (version < 1) {
      const sql = readFileSync(resolve(MIGRATIONS_DIR, "001_init.sql"), "utf-8");
      this.raw.exec(sql);
      this.raw.prepare("INSERT INTO schema_version (version) VALUES (?)").run(1);
    }
  }

  schemaVersion(): number {
    const row = this.raw
      .prepare("SELECT MAX(version) as v FROM schema_version")
      .get() as { v: number | null };
    return row?.v ?? 0;
  }

  close(): void {
    this.raw.close();
  }
}
