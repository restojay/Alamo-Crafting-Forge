import { createHmac } from "node:crypto";

/**
 * Generate HMAC-SHA256 signature for webhook payload.
 */
export function signPayload(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("hex");
}
