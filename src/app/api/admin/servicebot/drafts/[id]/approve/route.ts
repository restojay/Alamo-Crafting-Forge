import { NextRequest } from "next/server";
import { getServiceBotDb, getMailer } from "@/lib/servicebot/server";
import { sendApprovedDraft } from "@servicebot/core";
import { jsonOk, jsonError } from "@/lib/servicebot/http";

/**
 * POST /api/admin/servicebot/drafts/[id]/approve
 *
 * Approve a draft and trigger SMTP send.
 * Body: { actor: string, smtpConfig?: object, ticketEmail: string }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { actor, smtpConfig, ticketEmail } = body;

    if (!actor || !ticketEmail) {
      return jsonError("actor and ticketEmail are required", 400);
    }

    const db = getServiceBotDb();

    // First approve the draft
    db.markDraftApproved(id, actor, new Date().toISOString());

    // Then attempt to send if SMTP config is provided
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

    return jsonOk({ approved: true, sent: false });
  } catch (err) {
    return jsonError(
      err instanceof Error ? err.message : "Internal error",
      500,
    );
  }
}
