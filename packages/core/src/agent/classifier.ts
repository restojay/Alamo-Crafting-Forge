import type { ClaudeClient } from "./claude-client";
import type { ParsedEmail } from "../email/types";
import type { SubsidiaryConfig } from "../config/types";

export interface Classification {
  category: string;
  urgency: "low" | "medium" | "high" | "critical";
  summary: string;
}

/**
 * Classify an inbound email using the subsidiary's business context.
 * Returns a structured Classification with category, urgency, and summary.
 */
export async function classifyEmail(
  client: ClaudeClient,
  email: ParsedEmail,
  config: SubsidiaryConfig,
): Promise<Classification> {
  const systemPrompt = [
    `You are a customer service triage agent for ${config.name}.`,
    config.agent.businessContext,
    `Business hours: ${config.operations.businessHours}.`,
    `Classify the email into one of these categories: ${config.tasks.categories.join(", ")}.`,
    `Respond with JSON only, no markdown fences: {"category":"...","urgency":"low|medium|high|critical","summary":"..."}`,
  ].join("\n");

  const userMessage = [
    `From: ${email.from.name} <${email.from.email}>`,
    `Subject: ${email.subject}`,
    `Body:\n${email.bodyText}`,
  ].join("\n");

  const response = await client.complete(systemPrompt, userMessage);

  try {
    return JSON.parse(response) as Classification;
  } catch {
    throw new Error(
      `Failed to parse classification response as JSON: ${response}`,
    );
  }
}
