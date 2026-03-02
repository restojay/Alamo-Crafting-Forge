import { randomUUID } from "node:crypto";
import type {
  ServiceBotDatabase,
  SubsidiaryConfig,
  ClaudeClient,
  RawEmail,
  Classification,
} from "@servicebot/core";
import {
  parseEmail,
  matchEmailToSubsidiary,
  classifyEmail,
  extractActionItems,
  generateDraft,
  computeDedupeHash,
} from "@servicebot/core";

export interface ProcessNewEmailsDeps {
  db: ServiceBotDatabase;
  configs: SubsidiaryConfig[];
  claude: ClaudeClient;
  fetchMessages: (maxResults?: number) => Promise<RawEmail[]>;
  maxResults?: number;
  logger?: { error: (msg: string, err?: unknown) => void };
}

export interface ProcessResult {
  processed: number;
  skipped: number;
  unmatched: number;
  errors: number;
  fetchFailed?: boolean;
  errorDetails: Array<{ emailId: string; error: string }>;
}

export async function processNewEmails(
  deps: ProcessNewEmailsDeps,
): Promise<ProcessResult> {
  const { db, configs, claude, fetchMessages, maxResults, logger } = deps;
  const result: ProcessResult = { processed: 0, skipped: 0, unmatched: 0, errors: 0, errorDetails: [] };

  let messages: RawEmail[];
  try {
    messages = await fetchMessages(maxResults);
  } catch (err) {
    logger?.error("Failed to fetch messages", err);
    result.fetchFailed = true;
    return result;
  }

  for (const raw of messages) {
    try {
      // 1. Already-processed guard
      if (db.isEmailProcessed(raw.id)) {
        result.skipped++;
        continue;
      }

      // 2. Parse
      const parsed = parseEmail(raw);

      // 3. Match to subsidiary
      const match = matchEmailToSubsidiary(parsed, configs);
      if (!match.subsidiaryId) {
        db.saveAuditEntry({
          entityType: "email",
          entityId: raw.id,
          action: "unmatched_email",
          payloadJson: JSON.stringify({ from: parsed.from.email, subject: parsed.subject }),
        });
        db.markEmailProcessed(raw.id, "unmatched");
        result.unmatched++;
        continue;
      }

      // 4. Find config
      const config = configs.find((c) => c.id === match.subsidiaryId);
      if (!config) {
        result.errors++;
        continue;
      }

      // 5. Classify
      const classification: Classification = await classifyEmail(claude, parsed, config);

      // 6. Extract action items
      const actions = await extractActionItems(claude, parsed, config);

      // 7-8. Create and save ticket
      const now = new Date().toISOString();
      const ticketId = randomUUID();
      db.saveTicket({
        id: ticketId,
        subsidiaryId: match.subsidiaryId,
        emailId: raw.id,
        subject: parsed.subject,
        customerEmail: parsed.from.email,
        customerName: parsed.from.name,
        status: "open",
        createdAt: now,
        updatedAt: now,
      });

      // 9. Save contact
      db.saveContact({
        id: randomUUID(),
        subsidiaryId: match.subsidiaryId,
        email: parsed.from.email,
        name: parsed.from.name,
        createdAt: now,
      });

      // 10. Save tasks (with dedupe)
      for (const action of actions) {
        const hash = computeDedupeHash(match.subsidiaryId, action.description, action.category);
        if (db.isTaskDuplicate(hash)) continue;
        db.saveTask({
          id: randomUUID(),
          ticketId,
          subsidiaryId: match.subsidiaryId,
          category: action.category,
          state: "new",
          description: action.description,
          urgency: action.urgency,
          dedupeHash: hash,
          createdAt: now,
          updatedAt: now,
        });
      }

      // 11. Generate and save draft
      const draftBody = await generateDraft(claude, parsed, config, classification);
      db.saveDraft({
        id: randomUUID(),
        ticketId,
        body: draftBody,
        approved: 0,
        createdAt: now,
      });

      // 12. Audit entry
      db.saveAuditEntry({
        entityType: "ticket",
        entityId: ticketId,
        action: "processed",
        payloadJson: JSON.stringify(classification),
      });

      // 13. Mark email as processed
      db.markEmailProcessed(raw.id, "processed");

      // 14. Sync state
      db.saveSyncState("last_processed_email", raw.id);

      result.processed++;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      logger?.error(`Error processing email ${raw.id}`, err);
      result.errors++;
      result.errorDetails.push({ emailId: raw.id, error: errorMessage });
    }
  }

  return result;
}
