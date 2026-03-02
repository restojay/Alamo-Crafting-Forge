import { createHash } from "node:crypto";

/**
 * Compute a dedupe hash for a task based on subsidiary, description, and category.
 * Returns a SHA-256 hex string truncated to 16 characters.
 */
export function computeDedupeHash(
  subsidiaryId: string,
  description: string,
  category: string,
): string {
  const input = `${subsidiaryId}\0${description}\0${category}`;
  return createHash("sha256").update(input).digest("hex").slice(0, 16);
}
