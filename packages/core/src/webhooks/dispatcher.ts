import { randomUUID } from "node:crypto";
import type { ServiceBotDatabase } from "../db/database";
import type { WebhookAttempt } from "../db/types";
import type { WebhookEvent } from "../notifications/types";
import { signPayload } from "./signer";
import { nextDelayMs } from "./retry-policy";

export interface WebhookConfig {
  event: WebhookEvent;
  url: string;
  secretEnv?: string;
  timeoutMs?: number;
}

export interface DispatchInput {
  event: WebhookEvent;
  eventId: string;
  payload: Record<string, unknown>;
  subsidiaryId: string;
  webhooks: WebhookConfig[];
  db: ServiceBotDatabase;
  now: () => string;
  fetchFn?: typeof fetch;
}

export interface DispatchResult {
  dispatched: number;
  failed: number;
}

export async function dispatchWebhooks(
  input: DispatchInput,
): Promise<DispatchResult> {
  const matching = input.webhooks.filter((w) => w.event === input.event);
  let dispatched = 0;
  let failed = 0;

  for (const webhook of matching) {
    const attemptId = randomUUID();
    const body = JSON.stringify(input.payload);
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    // Add HMAC signature if secret is configured
    if (webhook.secretEnv) {
      const secret = process.env[webhook.secretEnv];
      if (secret) {
        headers["X-Webhook-Signature"] = signPayload(body, secret);
      }
    }

    const attempt: WebhookAttempt = {
      id: attemptId,
      subsidiaryId: input.subsidiaryId,
      eventType: input.event,
      eventId: input.eventId,
      url: webhook.url,
      status: "pending",
      attempt: 1,
      createdAt: input.now(),
    };

    try {
      const doFetch = input.fetchFn ?? fetch;
      const response = await doFetch(webhook.url, {
        method: "POST",
        headers,
        body,
        signal: AbortSignal.timeout(webhook.timeoutMs ?? 5000),
      });

      if (response.ok) {
        attempt.status = "delivered";
        attempt.responseCode = response.status;
        attempt.deliveredAt = input.now();
        dispatched++;
      } else {
        attempt.status = "pending";
        attempt.responseCode = response.status;
        attempt.errorMessage = `HTTP ${response.status}`;
        attempt.nextRetryAt = new Date(
          Date.parse(input.now()) + nextDelayMs(1, 1000, 60000),
        ).toISOString();
        failed++;
      }
    } catch (err) {
      attempt.status = "pending";
      attempt.errorMessage =
        err instanceof Error ? err.message : "Unknown error";
      attempt.nextRetryAt = new Date(
        Date.parse(input.now()) + nextDelayMs(1, 1000, 60000),
      ).toISOString();
      failed++;
    }

    input.db.insertWebhookAttempt(attempt);
  }

  return { dispatched, failed };
}
