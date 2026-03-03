import Database from "better-sqlite3";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";
import type {
  Ticket,
  Task,
  TaskState,
  Draft,
  Contact,
  AuditEntry,
  WebhookAttempt,
  Subsidiary,
} from "./types";

function loadMigrationSQL(filename: string): string {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);
  const candidates = [
    join(__dirname, "migrations", filename),
    join(__dirname, "..", "..", "src", "db", "migrations", filename),
  ];
  for (const candidate of candidates) {
    try {
      return readFileSync(candidate, "utf-8");
    } catch {
      // try next candidate
    }
  }
  throw new Error(
    `Could not find migration file ${filename}. Searched: ${candidates.join(", ")}`,
  );
}

export class ServiceBotDatabase {
  private db: Database.Database;

  constructor(dbPath: string) {
    this.db = new Database(dbPath);
    this.db.pragma("journal_mode = WAL");
    this.db.pragma("foreign_keys = ON");
    this.runMigrations();
  }

  private runMigrations(): void {
    this.db.exec(loadMigrationSQL("001_init.sql"));

    // Track applied migrations to ensure idempotency
    this.db.exec(
      `CREATE TABLE IF NOT EXISTS schema_migrations (
        version TEXT PRIMARY KEY,
        applied_at TEXT NOT NULL DEFAULT (datetime('now'))
      )`,
    );

    const applied = this.db
      .prepare("SELECT 1 FROM schema_migrations WHERE version = ?")
      .get("002") as { 1: number } | undefined;

    if (!applied) {
      this.db.exec(loadMigrationSQL("002_phase2_outbound_webhooks.sql"));
      this.db.prepare("INSERT INTO schema_migrations (version) VALUES (?)").run("002");
    }
  }

  // ── Tickets ──────────────────────────────────────────────────

  saveTicket(t: Ticket): void {
    this.db
      .prepare(
        `INSERT OR REPLACE INTO tickets
         (id, subsidiary_id, email_id, subject, customer_email, customer_name,
          status, assigned_to, sla_deadline, first_response_at, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        t.id,
        t.subsidiaryId,
        t.emailId,
        t.subject,
        t.customerEmail,
        t.customerName,
        t.status,
        t.assignedTo ?? null,
        t.slaDeadline ?? null,
        t.firstResponseAt ?? null,
        t.createdAt,
        t.updatedAt,
      );
  }

  getTicket(id: string): Ticket | undefined {
    const row = this.db
      .prepare("SELECT * FROM tickets WHERE id = ?")
      .get(id) as Record<string, unknown> | undefined;
    return row ? this.mapTicket(row) : undefined;
  }

  isEmailProcessed(emailId: string): boolean {
    const row = this.db
      .prepare("SELECT 1 FROM processed_emails WHERE email_id = ?")
      .get(emailId);
    return row !== undefined;
  }

  markEmailProcessed(emailId: string, status: string): void {
    this.db
      .prepare(
        `INSERT OR IGNORE INTO processed_emails (email_id, status, created_at)
         VALUES (?, ?, datetime('now'))`,
      )
      .run(emailId, status);
  }

  getOpenTickets(subsidiaryId?: string): Ticket[] {
    if (subsidiaryId) {
      const rows = this.db
        .prepare(
          "SELECT * FROM tickets WHERE status = 'open' AND subsidiary_id = ?",
        )
        .all(subsidiaryId) as Record<string, unknown>[];
      return rows.map((r) => this.mapTicket(r));
    }
    const rows = this.db
      .prepare("SELECT * FROM tickets WHERE status = 'open'")
      .all() as Record<string, unknown>[];
    return rows.map((r) => this.mapTicket(r));
  }

  private mapTicket(row: Record<string, unknown>): Ticket {
    return {
      id: row.id as string,
      subsidiaryId: row.subsidiary_id as string,
      emailId: row.email_id as string,
      subject: row.subject as string,
      customerEmail: row.customer_email as string,
      customerName: row.customer_name as string,
      status: row.status as Ticket["status"],
      assignedTo: (row.assigned_to as string) ?? undefined,
      slaDeadline: (row.sla_deadline as string) ?? undefined,
      firstResponseAt: (row.first_response_at as string) ?? undefined,
      createdAt: row.created_at as string,
      updatedAt: row.updated_at as string,
    };
  }

  // ── Tasks ────────────────────────────────────────────────────

  saveTask(t: Task): void {
    this.db
      .prepare(
        `INSERT OR REPLACE INTO tasks
         (id, ticket_id, subsidiary_id, category, state, description,
          urgency, dedupe_hash, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        t.id,
        t.ticketId ?? null,
        t.subsidiaryId,
        t.category,
        t.state,
        t.description,
        t.urgency,
        t.dedupeHash ?? null,
        t.createdAt,
        t.updatedAt,
      );
  }

  getTasksByTicket(ticketId: string): Task[] {
    const rows = this.db
      .prepare("SELECT * FROM tasks WHERE ticket_id = ?")
      .all(ticketId) as Record<string, unknown>[];
    return rows.map((r) => this.mapTask(r));
  }

  updateTaskState(id: string, state: TaskState): void {
    this.db
      .prepare(
        "UPDATE tasks SET state = ?, updated_at = datetime('now') WHERE id = ?",
      )
      .run(state, id);
  }

  isTaskDuplicate(dedupeHash: string): boolean {
    const row = this.db
      .prepare("SELECT 1 FROM tasks WHERE dedupe_hash = ?")
      .get(dedupeHash);
    return row !== undefined;
  }

  private mapTask(row: Record<string, unknown>): Task {
    return {
      id: row.id as string,
      subsidiaryId: row.subsidiary_id as string,
      ticketId: (row.ticket_id as string) ?? undefined,
      category: row.category as string,
      state: row.state as Task["state"],
      description: row.description as string,
      urgency: row.urgency as number,
      dedupeHash: row.dedupe_hash as string,
      createdAt: row.created_at as string,
      updatedAt: row.updated_at as string,
    };
  }

  // ── Drafts ───────────────────────────────────────────────────

  saveDraft(d: Draft): void {
    this.db
      .prepare(
        `INSERT INTO drafts
         (id, ticket_id, body, approved, approved_by, approved_at,
          rejected_at, rejection_reason, edited_body, sent_at, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        d.id,
        d.ticketId,
        d.body,
        d.approved,
        d.approvedBy ?? null,
        d.approvedAt ?? null,
        d.rejectedAt ?? null,
        d.rejectionReason ?? null,
        d.editedBody ?? null,
        d.sentAt ?? null,
        d.createdAt,
      );
  }

  getDraftsByTicket(ticketId: string): Draft[] {
    const rows = this.db
      .prepare("SELECT * FROM drafts WHERE ticket_id = ?")
      .all(ticketId) as Record<string, unknown>[];
    return rows.map((r) => this.mapDraft(r));
  }

  private mapDraft(row: Record<string, unknown>): Draft {
    return {
      id: row.id as string,
      ticketId: row.ticket_id as string,
      body: row.body as string,
      approved: row.approved as 0 | 1,
      approvedBy: (row.approved_by as string) ?? undefined,
      approvedAt: (row.approved_at as string) ?? undefined,
      rejectedAt: (row.rejected_at as string) ?? undefined,
      rejectionReason: (row.rejection_reason as string) ?? undefined,
      editedBody: (row.edited_body as string) ?? undefined,
      sentAt: (row.sent_at as string) ?? undefined,
      createdAt: row.created_at as string,
    };
  }

  // ── Draft Actions ───────────────────────────────────────────

  markDraftApproved(draftId: string, approvedBy: string, approvedAt: string): void {
    this.db
      .prepare(
        `UPDATE drafts SET approved = 1, approved_by = ?, approved_at = ?
         WHERE id = ?`,
      )
      .run(approvedBy, approvedAt, draftId);
  }

  markDraftRejected(draftId: string, reason: string, rejectedAt: string): void {
    this.db
      .prepare(
        `UPDATE drafts SET rejected_at = ?, rejection_reason = ?
         WHERE id = ?`,
      )
      .run(rejectedAt, reason, draftId);
  }

  markDraftSent(draftId: string, sentAt: string, messageId: string): void {
    this.db
      .prepare("UPDATE drafts SET sent_at = ? WHERE id = ?")
      .run(sentAt, draftId);
    this.saveAuditEntry({
      entityType: "draft",
      entityId: draftId,
      action: "sent",
      payloadJson: JSON.stringify({ sentAt, messageId }),
    });
  }

  getDraft(draftId: string): Draft | undefined {
    const row = this.db
      .prepare("SELECT * FROM drafts WHERE id = ?")
      .get(draftId) as Record<string, unknown> | undefined;
    return row ? this.mapDraft(row) : undefined;
  }

  // ── Webhook Attempts ──────────────────────────────────────

  insertWebhookAttempt(a: WebhookAttempt): void {
    this.db
      .prepare(
        `INSERT INTO webhook_attempts
         (id, subsidiary_id, event_type, event_id, url, status, attempt,
          response_code, error_message, next_retry_at, created_at, delivered_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        a.id,
        a.subsidiaryId,
        a.eventType,
        a.eventId,
        a.url,
        a.status,
        a.attempt,
        a.responseCode ?? null,
        a.errorMessage ?? null,
        a.nextRetryAt ?? null,
        a.createdAt,
        a.deliveredAt ?? null,
      );
  }

  listPendingWebhookRetries(now: string): WebhookAttempt[] {
    const rows = this.db
      .prepare(
        `SELECT * FROM webhook_attempts
         WHERE status = 'pending' AND next_retry_at IS NOT NULL AND next_retry_at <= ?
         ORDER BY next_retry_at ASC`,
      )
      .all(now) as Record<string, unknown>[];
    return rows.map((r) => this.mapWebhookAttempt(r));
  }

  private mapWebhookAttempt(row: Record<string, unknown>): WebhookAttempt {
    return {
      id: row.id as string,
      subsidiaryId: row.subsidiary_id as string,
      eventType: row.event_type as string,
      eventId: row.event_id as string,
      url: row.url as string,
      status: row.status as string,
      attempt: row.attempt as number,
      responseCode: (row.response_code as number) ?? undefined,
      errorMessage: (row.error_message as string) ?? undefined,
      nextRetryAt: (row.next_retry_at as string) ?? undefined,
      createdAt: row.created_at as string,
      deliveredAt: (row.delivered_at as string) ?? undefined,
    };
  }

  // ── Contacts ─────────────────────────────────────────────────

  saveContact(c: Contact): void {
    this.db
      .prepare(
        `INSERT OR IGNORE INTO contacts
         (id, subsidiary_id, email, name, created_at)
         VALUES (?, ?, ?, ?, ?)`,
      )
      .run(c.id, c.subsidiaryId, c.email, c.name, c.createdAt);
  }

  // ── Subsidiaries ─────────────────────────────────────────────

  saveSubsidiary(s: Subsidiary): void {
    this.db
      .prepare(
        `INSERT INTO subsidiaries (id, name, config_json, created_at)
         VALUES (?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET name = excluded.name, config_json = excluded.config_json`,
      )
      .run(s.id, s.name, s.configJson, s.createdAt);
  }

  listSubsidiaries(): Subsidiary[] {
    const rows = this.db
      .prepare("SELECT id, name, config_json, created_at FROM subsidiaries ORDER BY name ASC")
      .all() as Record<string, unknown>[];
    return rows.map((r) => this.mapSubsidiary(r));
  }

  private mapSubsidiary(row: Record<string, unknown>): Subsidiary {
    return {
      id: row.id as string,
      name: row.name as string,
      configJson: row.config_json as string,
      createdAt: row.created_at as string,
    };
  }

  // ── Audit Log ────────────────────────────────────────────────

  saveAuditEntry(
    e: Omit<AuditEntry, "id" | "createdAt"> & { createdAt?: string },
  ): void {
    const id = randomUUID();
    const createdAt = e.createdAt ?? new Date().toISOString();
    this.db
      .prepare(
        `INSERT INTO audit_log
         (id, entity_type, entity_id, action, payload_json, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
      )
      .run(id, e.entityType, e.entityId, e.action, e.payloadJson, createdAt);
  }

  // ── Sync State ───────────────────────────────────────────────

  saveSyncState(key: string, value: string): void {
    this.db
      .prepare(
        `INSERT INTO sync_state (key, value, updated_at)
         VALUES (?, ?, datetime('now'))
         ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')`,
      )
      .run(key, value);
  }

  getSyncState(key: string): string | undefined {
    const row = this.db
      .prepare("SELECT value FROM sync_state WHERE key = ?")
      .get(key) as { value: string } | undefined;
    return row?.value;
  }

  // ── Lifecycle ────────────────────────────────────────────────

  close(): void {
    this.db.close();
  }
}
