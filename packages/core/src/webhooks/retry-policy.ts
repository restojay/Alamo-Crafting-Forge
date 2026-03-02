/**
 * Calculate next delay for exponential backoff.
 * @param attempt - Current attempt number (1-based)
 * @param baseMs - Base delay in milliseconds
 * @param maxMs - Maximum delay cap in milliseconds
 */
export function nextDelayMs(
  attempt: number,
  baseMs: number,
  maxMs: number,
): number {
  const delay = baseMs * Math.pow(2, attempt - 1);
  return Math.min(delay, maxMs);
}

/** Maximum number of retry attempts before giving up. */
export const MAX_ATTEMPTS = 5;
