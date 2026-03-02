import { ServiceBotDatabase } from "@servicebot/core";
import { createMailer } from "@servicebot/core";
import type { OutboundMailer } from "@servicebot/core";

let db: ServiceBotDatabase | null = null;

export function getServiceBotDb(): ServiceBotDatabase {
  if (!db) {
    const dbPath = process.env.SERVICEBOT_DB_PATH || "./servicebot.db";
    db = new ServiceBotDatabase(dbPath);
  }
  return db;
}

export function getMailer(): OutboundMailer {
  return createMailer((config) => {
    // In production, this would use nodemailer.createTransport(config)
    // For now, return a stub that throws until SMTP is configured
    throw new Error(
      `SMTP not configured. Set up nodemailer transport for ${config.host}:${config.port}`,
    );
  });
}
