import { NextRequest } from "next/server";
import { getServiceBotDb, getMailer, getSubsidiarySmtpConfig } from "@/lib/servicebot/server";
import { sendApprovedDraft } from "@servicebot/core";
import { jsonOk, jsonError } from "@/lib/servicebot/http";

/**
 * POST /api/admin/servicebot/drafts/[id]/approve
 *
 * Approve a draft. If the ticket's subsidiary has SMTP configured,
 * sends via the mailer (dry-run or live depending on SMTP_LIVE env).
 * Body: { actor: string, ticketEmail: string }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { actor, ticketEmail } = body;

    if (!actor || !ticketEmail) {
      return jsonError("actor and ticketEmail are required", 400);
    }

    const db = getServiceBotDb();
    db.markDraftApproved(id, actor, new Date().toISOString());

    const draft = db.getDraft(id);
    if (!draft) return jsonError("Draft not found after approval", 500);

    const ticket = db.getTicket(draft.ticketId);
    const smtpConfig = ticket ? getSubsidiarySmtpConfig(ticket.subsidiaryId) : null;

    if (smtpConfig) {
      const mailer = getMailer();
      const result = await sendApprovedDraft({
        draftId: id,
        db,
        mailer,
        smtpConfig,
        ticketEmail,
        now: () => new Date().toISOString(),
      });
      return jsonOk({ approved: true, ...result });
    }

    return jsonOk({ approved: true, sent: false, reason: "no SMTP config for subsidiary" });
  } catch (err) {
    return jsonError(
      err instanceof Error ? err.message : "Internal error",
      500,
    );
  }
}
