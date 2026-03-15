import { loadConfig, getChannelTopicId, resetConfig } from "./config.js";
import { createLogger, type LogFn } from "./logger.js";

interface Notifier {
  sendText(channel: string | number, message: string): Promise<number | null>;
  sendApproval(channel: string | number, message: string, approvalId: string): Promise<boolean>;
}

export function createNotifier(configPath?: string, logFile?: string): Notifier {
  resetConfig();
  const config = loadConfig(configPath);
  const log: LogFn = logFile
    ? createLogger(logFile)
    : (_t, _ty, _s, _d) => {}; // no-op if no log file

  async function sendText(channel: string | number, message: string): Promise<number | null> {
    const topicId = typeof channel === "number" ? channel : getChannelTopicId(channel);
    const label = typeof channel === "string" ? channel : `topic-${channel}`;

    const basePayload: Record<string, unknown> = {
      chat_id: config.chat_id,
      text: message,
      disable_notification: true,
    };
    if (topicId) basePayload.message_thread_id = topicId;

    const url = `https://api.telegram.org/bot${config.bot_token}/sendMessage`;

    for (const parseMode of ["Markdown", undefined] as const) {
      const payload = { ...basePayload, ...(parseMode ? { parse_mode: parseMode } : {}) };
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          const resp = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json; charset=utf-8" },
            body: JSON.stringify(payload),
            signal: AbortSignal.timeout(15000),
          });

          const data = (await resp.json()) as {
            ok: boolean;
            description?: string;
            result?: { message_id: number };
          };

          if (data.ok) {
            log(label, "text", "delivered");
            return data.result?.message_id ?? 0;
          }

          if (parseMode && data.description?.includes("parse")) break;

          if (resp.status >= 500 && attempt === 0) {
            await new Promise((r) => setTimeout(r, 1000));
            continue;
          }

          log(label, "text", "failed", data.description);
          return null;
        } catch (err) {
          if (attempt === 0) {
            await new Promise((r) => setTimeout(r, 1000));
            continue;
          }
          log(label, "text", "failed", String(err));
          return null;
        }
      }
    }

    return null;
  }

  async function sendApproval(
    channel: string | number,
    message: string,
    approvalId: string
  ): Promise<boolean> {
    const topicId = typeof channel === "number" ? channel : getChannelTopicId(channel);
    const label = typeof channel === "string" ? channel : `topic-${channel}`;

    const replyMarkup = {
      inline_keyboard: [
        [
          { text: "Approve", callback_data: `approve:${approvalId}` },
          { text: "Reject", callback_data: `reject:${approvalId}` },
          { text: "Comment", callback_data: `comment:${approvalId}` },
        ],
      ],
    };

    const basePayload: Record<string, unknown> = {
      chat_id: config.chat_id,
      text: message,
      disable_notification: false,
      reply_markup: replyMarkup,
    };
    if (topicId) basePayload.message_thread_id = topicId;

    const url = `https://api.telegram.org/bot${config.bot_token}/sendMessage`;

    for (const parseMode of ["Markdown", undefined] as const) {
      const payload = { ...basePayload, ...(parseMode ? { parse_mode: parseMode } : {}) };
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          const resp = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json; charset=utf-8" },
            body: JSON.stringify(payload),
            signal: AbortSignal.timeout(15000),
          });

          const data = (await resp.json()) as { ok: boolean; description?: string };

          if (data.ok) {
            log(label, "approval_request", "delivered");
            return true;
          }

          if (parseMode && data.description?.includes("parse")) break;

          if (resp.status >= 500 && attempt === 0) {
            await new Promise((r) => setTimeout(r, 1000));
            continue;
          }

          log(label, "approval_request", "failed", data.description);
          return false;
        } catch (err) {
          if (attempt === 0) {
            await new Promise((r) => setTimeout(r, 1000));
            continue;
          }
          log(label, "approval_request", "failed", String(err));
          return false;
        }
      }
    }

    return false;
  }

  return { sendText, sendApproval };
}
