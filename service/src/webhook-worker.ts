import type { ServiceBotDatabase } from "@servicebot/core";
import { nextDelayMs, MAX_ATTEMPTS } from "@servicebot/core";

export interface WebhookWorkerDeps {
  db: ServiceBotDatabase;
  now?: () => string;
  fetchFn?: typeof fetch;
}

export interface RetryResult {
  processed: number;
  delivered: number;
  failed: number;
  exhausted: number;
}

/**
 * Process pending webhook retries from the database.
 * Reads due retries, re-sends, and updates attempt records.
 */
export async function processWebhookRetries(
  deps: WebhookWorkerDeps,
): Promise<RetryResult> {
  const { db, now = () => new Date().toISOString(), fetchFn = fetch } = deps;
  const result: RetryResult = { processed: 0, delivered: 0, failed: 0, exhausted: 0 };
  const pending = db.listPendingWebhookRetries(now());

  for (const attempt of pending) {
    result.processed++;
    const nextAttempt = attempt.attempt + 1;

    try {
      const response = await fetchFn(attempt.url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventType: attempt.eventType,
          eventId: attempt.eventId,
          retry: true,
          attempt: nextAttempt,
        }),
        signal: AbortSignal.timeout(5000),
      });

      if (response.ok) {
        db.insertWebhookAttempt({
          ...attempt,
          id: `${attempt.id}-retry-${nextAttempt}`,
          attempt: nextAttempt,
          status: "delivered",
          responseCode: response.status,
          deliveredAt: now(),
          nextRetryAt: undefined,
          createdAt: now(),
        });
        result.delivered++;
      } else {
        recordFailure(db, attempt, nextAttempt, `HTTP ${response.status}`, response.status, now(), result);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      recordFailure(db, attempt, nextAttempt, msg, undefined, now(), result);
    }
  }

  return result;
}

function recordFailure(
  db: ServiceBotDatabase,
  attempt: { id: string; subsidiaryId: string; eventType: string; eventId: string; url: string },
  nextAttempt: number,
  errorMessage: string,
  responseCode: number | undefined,
  nowStr: string,
  result: RetryResult,
): void {
  if (nextAttempt >= MAX_ATTEMPTS) {
    db.insertWebhookAttempt({
      ...attempt,
      id: `${attempt.id}-retry-${nextAttempt}`,
      attempt: nextAttempt,
      status: "exhausted",
      errorMessage,
      responseCode,
      createdAt: nowStr,
    });
    result.exhausted++;
  } else {
    const delay = nextDelayMs(nextAttempt, 1000, 60000);
    db.insertWebhookAttempt({
      ...attempt,
      id: `${attempt.id}-retry-${nextAttempt}`,
      attempt: nextAttempt,
      status: "pending",
      errorMessage,
      responseCode,
      nextRetryAt: new Date(Date.parse(nowStr) + delay).toISOString(),
      createdAt: nowStr,
    });
    result.failed++;
  }
}
