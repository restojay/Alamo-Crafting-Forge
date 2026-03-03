import nodemailer from "nodemailer";
import { ServiceBotDatabase } from "@servicebot/core";
import { createMailer } from "@servicebot/core";
import type { OutboundMailer, SendInput } from "@servicebot/core";
import type { SubsidiaryConfig } from "@servicebot/core";

let db: ServiceBotDatabase | null = null;

export function getServiceBotDb(): ServiceBotDatabase {
  if (!db) {
    const dbPath = process.env.SERVICEBOT_DB_PATH || "./servicebot.db";
    db = new ServiceBotDatabase(dbPath);
  }
  return db;
}

const SMTP_LIVE = process.env.SMTP_LIVE === "true";
const SMTP_TEST_RECIPIENT = process.env.SMTP_TEST_RECIPIENT || "restojay01@gmail.com";

export function getMailer(): OutboundMailer {
  const baseMailer = createMailer((config: NonNullable<SubsidiaryConfig["smtp"]>) => {
    const password = process.env[config.passwordEnv];
    if (!password) {
      throw new Error(`SMTP password env var not set: ${config.passwordEnv}`);
    }
    return nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: { user: config.username, pass: password },
    });
  });

  if (SMTP_LIVE) {
    return baseMailer;
  }

  // Dry-run mode: redirect all sends to test recipient
  return {
    async send(input: SendInput) {
      const dryRunInput: SendInput = {
        ...input,
        to: SMTP_TEST_RECIPIENT,
        subject: `[DRY-RUN → ${input.to}] ${input.subject}`,
      };
      return baseMailer.send(dryRunInput);
    },
  };
}
