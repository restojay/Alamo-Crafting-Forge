import type { ClaudeClient } from "./claude-client";
import type { ParsedEmail } from "../email/types";
import type { SubsidiaryConfig } from "../config/types";

export interface ActionItem {
  description: string;
  category: string;
  urgency: number; // 0 = low, 1 = medium, 2 = high, 3 = critical
}

/**
 * Extract actionable tasks from an inbound email.
 * Returns an array of structured ActionItems for the task engine to process.
 */
export async function extractActionItems(
  client: ClaudeClient,
  email: ParsedEmail,
  config: SubsidiaryConfig,
): Promise<ActionItem[]> {
  const systemPrompt = [
    `You are a task extraction agent for ${config.name}.`,
    config.agent.businessContext,
    `Valid categories: ${config.tasks.categories.join(", ")}.`,
    `Extract every actionable item from the email. For each item, provide:`,
    `- description: what needs to be done`,
    `- category: one of the valid categories above`,
    `- urgency: integer 0-3 (0=low, 1=medium, 2=high, 3=critical)`,
    `Respond with a JSON array only, no markdown fences: [{"description":"...","category":"...","urgency":0}]`,
    `If there are no action items, return an empty array: []`,
  ].join("\n");

  const userMessage = [
    `From: ${email.from.name} <${email.from.email}>`,
    `Subject: ${email.subject}`,
    `Body:\n${email.bodyText}`,
  ].join("\n");

  const response = await client.complete(systemPrompt, userMessage);

  try {
    const items = JSON.parse(response) as ActionItem[];
    if (!Array.isArray(items)) {
      throw new TypeError("Expected an array of action items");
    }
    return items;
  } catch {
    throw new Error(
      `Failed to parse action items response as JSON: ${response}`,
    );
  }
}
