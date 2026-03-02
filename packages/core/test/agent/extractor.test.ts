import { describe, it, expect, vi } from "vitest";
import { extractActionItems } from "../../src/agent/extractor.js";
import type { ClaudeClient } from "../../src/agent/claude-client.js";
import type { ParsedEmail } from "../../src/email/types.js";
import type { SubsidiaryConfig } from "../../src/config/types.js";

const stubEmail: ParsedEmail = {
  id: "msg-002",
  threadId: "thread-002",
  from: { name: "John Doe", email: "john@example.com" },
  to: { name: "Sunny Side HVAC", email: "info@sunnysidehvac.com" },
  subject: "Reschedule and filter question",
  bodyText:
    "Hi, I need to reschedule my 2pm service call to 4pm. Also, do you carry MERV-13 filters? Thanks!",
  receivedAt: "2026-03-01T11:30:00Z",
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
    faq: [],
    services: ["AC repair", "furnace installation", "HVAC maintenance"],
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

describe("extractActionItems", () => {
  it("returns array of action items from Claude response", async () => {
    const items = [
      {
        description: "Reschedule 2pm service call to 4pm",
        category: "service-call",
        urgency: 2,
      },
      {
        description: "Answer product availability question about MERV-13 filters",
        category: "inquiry",
        urgency: 0,
      },
    ];
    const mockClient: ClaudeClient = {
      complete: vi.fn().mockResolvedValue(JSON.stringify(items)),
    };

    const result = await extractActionItems(mockClient, stubEmail, stubConfig);

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      description: "Reschedule 2pm service call to 4pm",
      category: "service-call",
      urgency: 2,
    });
    expect(result[1].category).toBe("inquiry");
    expect(result[1].urgency).toBe(0);
  });

  it("returns empty array when no action items found", async () => {
    const mockClient: ClaudeClient = {
      complete: vi.fn().mockResolvedValue("[]"),
    };

    const result = await extractActionItems(mockClient, stubEmail, stubConfig);

    expect(result).toEqual([]);
  });

  it("passes email content and categories to the prompt", async () => {
    const mockClient: ClaudeClient = {
      complete: vi.fn().mockResolvedValue("[]"),
    };

    await extractActionItems(mockClient, stubEmail, stubConfig);

    const [systemPrompt, userMessage] = (mockClient.complete as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(systemPrompt).toContain("Sunny Side HVAC");
    expect(systemPrompt).toContain("service-call");
    expect(systemPrompt).toContain("inquiry");
    expect(userMessage).toContain("John Doe");
    expect(userMessage).toContain("Reschedule");
  });

  it("throws on malformed JSON response", async () => {
    const mockClient: ClaudeClient = {
      complete: vi.fn().mockResolvedValue("Sure, here are the action items:"),
    };

    await expect(
      extractActionItems(mockClient, stubEmail, stubConfig),
    ).rejects.toThrow("Failed to parse action items response as JSON");
  });

  it("throws when response is a JSON object instead of array", async () => {
    const mockClient: ClaudeClient = {
      complete: vi
        .fn()
        .mockResolvedValue(
          JSON.stringify({ description: "single item", category: "inquiry", urgency: 0 }),
        ),
    };

    await expect(
      extractActionItems(mockClient, stubEmail, stubConfig),
    ).rejects.toThrow("Failed to parse action items response as JSON");
  });
});
