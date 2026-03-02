import type { ServiceBotDatabase } from "../../db/database";
import type { OutboundMailer } from "./mailer";
import type { SubsidiaryConfig } from "../../config/types";

export interface SendApprovedDraftInput {
  draftId: string;
  db: ServiceBotDatabase;
  mailer: OutboundMailer;
  smtpConfig: NonNullable<SubsidiaryConfig["smtp"]>;
  ticketEmail: string;
  now: () => string;
}

export interface SendApprovedDraftResult {
  sent: boolean;
  alreadySent?: boolean;
  messageId?: string;
}

export async function sendApprovedDraft(
  input: SendApprovedDraftInput,
): Promise<SendApprovedDraftResult> {
  const draft = input.db.getDraft(input.draftId);
  if (!draft) throw new Error(`Draft not found: ${input.draftId}`);
  if (!draft.approved) throw new Error(`Draft not approved: ${input.draftId}`);
  if (draft.sentAt) return { sent: false, alreadySent: true };

  const ticket = input.db.getTicket(draft.ticketId);
  const subject = ticket ? `Re: ${ticket.subject}` : "Re: Support Request";

  const result = await input.mailer.send({
    to: input.ticketEmail,
    subject,
    text: draft.body,
    smtp: input.smtpConfig,
  });

  input.db.markDraftSent(input.draftId, input.now(), result.messageId);
  return { sent: true, messageId: result.messageId };
}
