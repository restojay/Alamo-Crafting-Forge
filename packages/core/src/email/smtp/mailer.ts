import type { SubsidiaryConfig } from "../../config/types";

export interface SendInput {
  to: string;
  subject: string;
  text: string;
  html?: string;
  smtp: NonNullable<SubsidiaryConfig["smtp"]>;
}

export interface SendResult {
  messageId: string;
}

export interface OutboundMailer {
  send(input: SendInput): Promise<SendResult>;
}

type TransportFactory = (
  config: NonNullable<SubsidiaryConfig["smtp"]>,
) => { sendMail(opts: Record<string, unknown>): Promise<{ messageId: string }> };

export function createMailer(transportFactory: TransportFactory): OutboundMailer {
  return {
    async send(input: SendInput): Promise<SendResult> {
      if (!input.smtp) throw new Error("SMTP config is required");
      const transport = transportFactory(input.smtp);
      const from = input.smtp.fromName
        ? `"${input.smtp.fromName}" <${input.smtp.fromEmail}>`
        : input.smtp.fromEmail;
      const result = await transport.sendMail({
        from,
        to: input.to,
        subject: input.subject,
        text: input.text,
        html: input.html,
      });
      return { messageId: result.messageId };
    },
  };
}
