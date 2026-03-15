import { randomUUID } from "crypto";
import type { OpenClawDatabase } from "../db/database.js";
import type { EventLog } from "./event-log.js";
import type { ProposalPack, ApprovalDecision } from "@openclaw/protocol-qa";

export function createApprovals(db: OpenClawDatabase, eventLog: EventLog) {
  const insertStmt = db.raw.prepare(`
    INSERT INTO approvals (id, project, title, intent, diff, impact, requested_by, status, ceo_response, created_at, decided_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const decideStmt = db.raw.prepare(`
    UPDATE approvals SET status = ?, ceo_response = ?, decided_at = ? WHERE id = ?
  `);

  function create(
    project: string,
    title: string,
    intent: string,
    impact: string,
    requestedBy: string,
    diff?: string
  ): ProposalPack {
    const id = `proposal:${randomUUID().slice(0, 8)}`;
    const now = new Date().toISOString();

    const proposal: ProposalPack = {
      id,
      project,
      title,
      intent,
      diff: diff || null,
      impact,
      requested_by: requestedBy,
      status: "pending",
      ceo_response: null,
      created_at: now,
      decided_at: null,
    };

    insertStmt.run(id, project, title, intent, proposal.diff, impact, requestedBy, "pending", null, now, null);
    eventLog.append("approval.requested", requestedBy, project, { proposal_id: id, title, intent, impact });

    return proposal;
  }

  function decide(proposalId: string, decision: ApprovalDecision, response?: string): ProposalPack | null {
    const existing = db.raw.prepare("SELECT * FROM approvals WHERE id = ?").get(proposalId) as ProposalPack | undefined;
    if (!existing || existing.status !== "pending") return null;

    const now = new Date().toISOString();
    decideStmt.run(decision, response || null, now, proposalId);

    eventLog.append("approval.decided", "ceo", existing.project, {
      proposal_id: proposalId,
      decision,
      response,
    });

    return { ...existing, status: decision, ceo_response: response || null, decided_at: now };
  }

  function getPending(project?: string): ProposalPack[] {
    if (project) {
      return db.raw.prepare("SELECT * FROM approvals WHERE status = 'pending' AND project = ? ORDER BY created_at ASC")
        .all(project) as ProposalPack[];
    }
    return db.raw.prepare("SELECT * FROM approvals WHERE status = 'pending' ORDER BY created_at ASC")
      .all() as ProposalPack[];
  }

  function get(proposalId: string): ProposalPack | null {
    return (db.raw.prepare("SELECT * FROM approvals WHERE id = ?").get(proposalId) as ProposalPack) ?? null;
  }

  function getRecent(limit = 20): ProposalPack[] {
    return db.raw.prepare("SELECT * FROM approvals ORDER BY created_at DESC LIMIT ?")
      .all(limit) as ProposalPack[];
  }

  return { create, decide, getPending, get, getRecent };
}

export type Approvals = ReturnType<typeof createApprovals>;
