import { describe, it, expect, vi } from "vitest";
import { generateDraft } from "../../src/agent/draft-generator.js";
import type { ClaudeClient } from "../../src/agent/claude-client.js";
import type { ParsedEmail } from "../../src/email/types.js";
import type { SubsidiaryConfig } from "../../src/config/types.js";
import type { Classification } from "../../src/agent/classifier.js";

const stubEmail: ParsedEmail = {
  id: "msg-003",
  threadId: "thread-003",
  from: { name: "Ana Torres", email: "ana@example.com" },
  to: { name: "Sunny Side HVAC", email: "info@sunnysidehvac.com" },
  subject: "Do you offer duct cleaning?",
  bodyText:
    "Hello! I've been wanting to get my ducts cleaned. Do you offer this service? What's the price range?",
  receivedAt: "2026-03-01T14:00:00Z",
  hasAttachments: false,
  labels: ["INBOX"],
};

const stubConfig: SubsidiaryConfig = {
  id: "sunny-side-hvac",
  name: "Sunny Side HVAC",
  sector: "hvac",
  email: {
    inbound: "info@sunnysidehvac.com",
    smtp: "smtp.gmail.com",
    credentialKey: "sunny-side-creds",
    pollIntervalMinutes: 5,
  },
  agent: {
    businessContext: "Residential and commercial HVAC contractor offering repairs, installations, and maintenance.",
    tone: "professional and friendly",
    faq: [
      {
        question: "Do you offer duct cleaning?",
        answer: "Yes! Duct cleaning starts at $150 depending on system size.",
      },
    ],
    services: ["AC repair", "furnace installation", "HVAC maintenance", "duct cleaning", "heat pump service"],
  },
  operations: {
    businessHours: "Mon-Sat 8am-6pm",
    escalationContact: "info@sunnysidehvac.com",
  },
  tasks: {
    recurring: [],
    categories: ["service-call", "inquiry", "complaint", "follow-up"],
  },
  webhooks: [],
};

const stubClassification: Classification = {
  category: "inquiry",
  urgency: "low",
  summary: "Customer asking about duct cleaning service availability and pricing",
};

describe("generateDraft", () => {
  it("returns draft text from Claude response", async () => {
    const draftBody =
      "Hi Ana! Thank you for reaching out. Yes, we do offer duct cleaning! " +
      "Pricing starts at $150 depending on system size. We'd love to book a visit. " +
      "Feel free to call us or reply to schedule. — Sunny Side HVAC";

    const mockClient: ClaudeClient = {
      complete: vi.fn().mockResolvedValue(draftBody),
    };

    const result = await generateDraft(
      mockClient,
      stubEmail,
      stubConfig,
      stubClassification,
    );

    expect(result).toBe(draftBody);
    expect(typeof result).toBe("string");
    expect(result.length).toBeGreaterThan(0);
  });

  it("includes FAQ context, tone, and classification in the prompt", async () => {
    const mockClient: ClaudeClient = {
      complete: vi.fn().mockResolvedValue("Draft reply here."),
    };

    await generateDraft(mockClient, stubEmail, stubConfig, stubClassification);

    const [systemPrompt, userMessage] = (mockClient.complete as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(systemPrompt).toContain("professional and friendly");
    expect(systemPrompt).toContain("duct cleaning");
    expect(systemPrompt).toContain("$150");
    expect(systemPrompt).toContain('category="inquiry"');
    expect(systemPrompt).toContain('urgency="low"');
    expect(systemPrompt).toContain("Sunny Side HVAC");
    expect(userMessage).toContain("Ana Torres");
    expect(userMessage).toContain("Do you offer duct cleaning?");
  });

  it("works with empty FAQ list", async () => {
    const configNoFaq = {
      ...stubConfig,
      agent: { ...stubConfig.agent, faq: [] },
    };
    const mockClient: ClaudeClient = {
      complete: vi.fn().mockResolvedValue("We appreciate your inquiry."),
    };

    const result = await generateDraft(
      mockClient,
      stubEmail,
      configNoFaq,
      stubClassification,
    );

    expect(result).toBe("We appreciate your inquiry.");
    const [systemPrompt] = (mockClient.complete as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(systemPrompt).not.toContain("Relevant FAQ entries");
  });

  it("propagates API errors from the client", async () => {
    const mockClient: ClaudeClient = {
      complete: vi
        .fn()
        .mockRejectedValue(new Error("Claude API error: 500 Internal Server Error")),
    };

    await expect(
      generateDraft(mockClient, stubEmail, stubConfig, stubClassification),
    ).rejects.toThrow("Claude API error: 500");
  });
});
