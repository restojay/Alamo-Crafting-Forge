import type { Approvals } from "./approvals.js";
import type { OpenClawDatabase } from "../db/database.js";
import { createNotifier } from "../notify.js";
import { resetConfig } from "../config.js";

export function createDeliveryLoop(
  approvals: Approvals,
  db: OpenClawDatabase,
  configPath: string,
  logFile: string
) {
  // Delivery state persisted in SQLite to survive restarts
  db.raw.exec(`
    CREATE TABLE IF NOT EXISTS delivery_log (
      proposal_id TEXT PRIMARY KEY,
      delivered_at TEXT NOT NULL
    )
  `);

  const isDeliveredStmt = db.raw.prepare("SELECT 1 FROM delivery_log WHERE proposal_id = ?");
  const markDeliveredStmt = db.raw.prepare("INSERT OR IGNORE INTO delivery_log (proposal_id, delivered_at) VALUES (?, ?)");

  async function tick(): Promise<number> {
    const pending = approvals.getPending();
    let count = 0;

    for (const proposal of pending) {
      if (isDeliveredStmt.get(proposal.id)) continue;

      resetConfig();
      const { sendApproval } = createNotifier(configPath, logFile);
      const message = [
        `*Governance Gate: ${proposal.title}*`,
        "",
        `*Project:* ${proposal.project}`,
        `*Intent:* ${proposal.intent}`,
        `*Impact:* ${proposal.impact}`,
      ].join("\n");

      const sent = await sendApproval("actions", message, proposal.id);
      if (sent) {
        markDeliveredStmt.run(proposal.id, new Date().toISOString());
        count++;
      }
    }

    return count;
  }

  function startInterval(intervalMs = 30_000): { stop: () => void } {
    // Tick immediately on start, then on interval
    tick().catch(() => {});
    const id = setInterval(() => { tick().catch(() => {}); }, intervalMs);
    return { stop: () => clearInterval(id) };
  }

  return { tick, startInterval };
}

export type DeliveryLoop = ReturnType<typeof createDeliveryLoop>;
