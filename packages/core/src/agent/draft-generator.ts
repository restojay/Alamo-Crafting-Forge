import type { ClaudeClient } from "./claude-client";
import type { ParsedEmail } from "../email/types";
import type { SubsidiaryConfig } from "../config/types";
import type { Classification } from "./classifier";

/**
 * Generate a draft reply to an inbound email using the subsidiary's
 * tone, FAQ knowledge, and the classification context.
 * Returns the draft body text ready for human review.
 */
export async function generateDraft(
  client: ClaudeClient,
  email: ParsedEmail,
  config: SubsidiaryConfig,
  classification: Classification,
): Promise<string> {
  const faqBlock =
    config.agent.faq.length > 0
      ? [
          "Relevant FAQ entries:",
          ...config.agent.faq.map(
            (f) => `Q: ${f.question}\nA: ${f.answer}`,
          ),
        ].join("\n")
      : "";

  const systemPrompt = [
    `You are a customer service representative for ${config.name}.`,
    config.agent.businessContext,
    `Tone: ${config.agent.tone}.`,
    `Services offered: ${config.agent.services.join(", ")}.`,
    faqBlock,
    `The email was classified as: category="${classification.category}", urgency="${classification.urgency}".`,
    `Summary: ${classification.summary}`,
    `Draft a professional reply to the customer. Return ONLY the email body text, no subject line or headers.`,
  ]
    .filter(Boolean)
    .join("\n");

  const userMessage = [
    `From: ${email.from.name} <${email.from.email}>`,
    `Subject: ${email.subject}`,
    `Body:\n${email.bodyText}`,
  ].join("\n");

  return client.complete(systemPrompt, userMessage);
}
