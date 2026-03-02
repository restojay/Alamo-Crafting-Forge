import { describe, it, expect, vi } from "vitest";
import { classifyEmail } from "../../src/agent/classifier.js";
import type { ClaudeClient } from "../../src/agent/claude-client.js";
import type { ParsedEmail } from "../../src/email/types.js";
import type { SubsidiaryConfig } from "../../src/config/types.js";

const stubEmail: ParsedEmail = {
  id: "msg-001",
  threadId: "thread-001",
  from: { name: "Maria Garcia", email: "maria@example.com" },
  to: { name: "Sunny Side HVAC", email: "info@sunnysidehvac.com" },
  subject: "Service availability this Saturday?",
  bodyText:
    "Hi, I'd like to schedule an AC repair and maintenance this Saturday afternoon. Do you have any openings?",
  receivedAt: "2026-03-01T10:00:00Z",
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
        question: "What are your hours?",
        answer: "Monday-Saturday, 8am-6pm.",
      },
    ],
    services: ["AC repair", "furnace installation", "HVAC maintenance", "duct cleaning"],
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

describe("classifyEmail", () => {
  it("returns structured classification from Claude response", async () => {
    const mockClient: ClaudeClient = {
      complete: vi.fn().mockResolvedValue(
        JSON.stringify({
          category: "service-call",
          urgency: "medium",
          summary: "Customer asking about service availability",
        }),
      ),
    };

    const result = await classifyEmail(mockClient, stubEmail, stubConfig);

    expect(result).toEqual({
      category: "service-call",
      urgency: "medium",
      summary: "Customer asking about service availability",
    });
    expect(mockClient.complete).toHaveBeenCalledOnce();
  });

  it("passes subsidiary context and email fields to the prompt", async () => {
    const mockClient: ClaudeClient = {
      complete: vi.fn().mockResolvedValue(
        JSON.stringify({
          category: "inquiry",
          urgency: "low",
          summary: "General inquiry",
        }),
      ),
    };

    await classifyEmail(mockClient, stubEmail, stubConfig);

    const [systemPrompt, userMessage] = (mockClient.complete as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(systemPrompt).toContain("Sunny Side HVAC");
    expect(systemPrompt).toContain("service-call");
    expect(systemPrompt).toContain("Mon-Sat 8am-6pm");
    expect(userMessage).toContain("Maria Garcia");
    expect(userMessage).toContain("maria@example.com");
    expect(userMessage).toContain("Service availability this Saturday?");
    expect(userMessage).toContain("AC repair and maintenance");
  });

  it("throws on malformed JSON response", async () => {
    const mockClient: ClaudeClient = {
      complete: vi.fn().mockResolvedValue("not valid json at all"),
    };

    await expect(
      classifyEmail(mockClient, stubEmail, stubConfig),
    ).rejects.toThrow("Failed to parse classification response as JSON");
  });

  it("throws on API error propagated from client", async () => {
    const mockClient: ClaudeClient = {
      complete: vi.fn().mockRejectedValue(new Error("Claude API error: 429")),
    };

    await expect(
      classifyEmail(mockClient, stubEmail, stubConfig),
    ).rejects.toThrow("Claude API error: 429");
  });
});
