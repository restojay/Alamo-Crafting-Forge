import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ServiceBotDatabase } from "@servicebot/core";
import type { ClaudeClient, SubsidiaryConfig, RawEmail } from "@servicebot/core";
import { processNewEmails } from "../src/index.js";
import type { ProcessNewEmailsDeps } from "../src/index.js";

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
    faq: [{ question: "What are your hours?", answer: "Mon-Sat 8am-6pm." }],
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

function makeRawEmail(overrides: Partial<RawEmail> = {}): RawEmail {
  return {
    id: "msg-001",
    threadId: "thread-001",
    from: "Maria Garcia <maria@example.com>",
    to: "Sunny Side HVAC <info@sunnysidehvac.com>",
    subject: "Sunny Side HVAC service call this Saturday?",
    body: "Hi, I'd like to schedule an AC repair this Saturday. Any openings?",
    date: "2026-03-01T10:00:00Z",
    hasAttachments: false,
    labels: ["INBOX"],
    ...overrides,
  };
}

function makeMockClaude(): ClaudeClient {
  let callCount = 0;
  return {
    complete: vi.fn().mockImplementation(async (systemPrompt: string) => {
      callCount++;
      // First call = classify, second = extract, third = draft
      if (systemPrompt.includes("triage agent")) {
        return JSON.stringify({
          category: "service-call",
          urgency: "medium",
          summary: "Customer wants a Saturday service call",
        });
      }
      if (systemPrompt.includes("task extraction")) {
        return JSON.stringify([
          {
            description: "Schedule AC repair for Saturday",
            category: "service-call",
            urgency: 1,
          },
        ]);
      }
      // draft
      return "Thank you for reaching out! We have openings this Saturday.";
    }),
  };
}

function makeDeps(overrides: Partial<ProcessNewEmailsDeps> = {}): ProcessNewEmailsDeps & { db: ServiceBotDatabase } {
  const db = new ServiceBotDatabase(":memory:");
  return {
    db,
    configs: [stubConfig],
    claude: makeMockClaude(),
    fetchMessages: vi.fn().mockResolvedValue([makeRawEmail()]),
    ...overrides,
  };
}

describe("processNewEmails", () => {
  let deps: ReturnType<typeof makeDeps>;

  beforeEach(() => {
    deps = makeDeps();
  });

  afterEach(() => {
    deps.db.close();
  });

  it("processes an email end-to-end: ticket + tasks + draft", async () => {
    const result = await processNewEmails(deps);

    expect(result.processed).toBe(1);
    expect(result.skipped).toBe(0);
    expect(result.unmatched).toBe(0);
    expect(result.errors).toBe(0);

    // Verify ticket was saved
    const tickets = deps.db.getOpenTickets("sunny-side-hvac");
    expect(tickets).toHaveLength(1);
    expect(tickets[0].customerEmail).toBe("maria@example.com");
    expect(tickets[0].customerName).toBe("Maria Garcia");
    expect(tickets[0].subject).toContain("Sunny Side HVAC");

    // Verify tasks
    const tasks = deps.db.getTasksByTicket(tickets[0].id);
    expect(tasks).toHaveLength(1);
    expect(tasks[0].description).toBe("Schedule AC repair for Saturday");
    expect(tasks[0].category).toBe("service-call");

    // Verify draft
    const drafts = deps.db.getDraftsByTicket(tickets[0].id);
    expect(drafts).toHaveLength(1);
    expect(drafts[0].body).toContain("openings this Saturday");
    expect(drafts[0].approved).toBe(0);

    // Verify sync state
    expect(deps.db.getSyncState("last_processed_email")).toBe("msg-001");
  });

  it("skips already-processed emails", async () => {
    // Process once
    await processNewEmails(deps);
    expect(deps.db.isEmailProcessed("msg-001")).toBe(true);

    // Process again — should skip
    const result = await processNewEmails(deps);
    expect(result.skipped).toBe(1);
    expect(result.processed).toBe(0);
  });

  it("handles unmatched emails (no subsidiaryId)", async () => {
    const unmatchedEmail = makeRawEmail({
      id: "msg-unmatched",
      from: "stranger@unknown.com",
      to: "random@nowhere.com",
      subject: "Random inquiry",
      body: "This doesn't match any subsidiary.",
    });

    deps = makeDeps({
      fetchMessages: vi.fn().mockResolvedValue([unmatchedEmail]),
    });

    const result = await processNewEmails(deps);
    expect(result.unmatched).toBe(1);
    expect(result.processed).toBe(0);

    // No ticket should exist
    const tickets = deps.db.getOpenTickets();
    expect(tickets).toHaveLength(0);
  });

  it("deduplicates action items via hash", async () => {
    // Two emails that produce the same action item
    const email1 = makeRawEmail({ id: "msg-dup-1" });
    const email2 = makeRawEmail({ id: "msg-dup-2" });

    deps = makeDeps({
      fetchMessages: vi.fn().mockResolvedValue([email1, email2]),
    });

    const result = await processNewEmails(deps);
    expect(result.processed).toBe(2);

    // Both tickets exist
    const tickets = deps.db.getOpenTickets("sunny-side-hvac");
    expect(tickets).toHaveLength(2);

    // But only 1 task (the duplicate hash was detected for the second)
    const allTasks = [
      ...deps.db.getTasksByTicket(tickets[0].id),
      ...deps.db.getTasksByTicket(tickets[1].id),
    ];
    expect(allTasks).toHaveLength(1);
  });

  it("captures error details when claude.complete rejects for one email", async () => {
    const okEmail = makeRawEmail({ id: "msg-ok-1" });
    const failEmail = makeRawEmail({ id: "msg-fail" });
    const okEmail2 = makeRawEmail({ id: "msg-ok-2" });

    let failCallCount = 0;
    const failingClaude: ClaudeClient = {
      complete: vi.fn().mockImplementation(async (systemPrompt: string) => {
        // Fail on the first classify call for msg-fail (the second email's first claude call)
        failCallCount++;
        // Calls 1-3 are for msg-ok-1, calls 4-6 for msg-fail, calls 7-9 for msg-ok-2
        if (failCallCount === 4) {
          throw new Error("Claude API rate limit exceeded");
        }
        if (systemPrompt.includes("triage agent")) {
          return JSON.stringify({
            category: "service-call",
            urgency: "medium",
            summary: "Customer wants a Saturday service call",
          });
        }
        if (systemPrompt.includes("task extraction")) {
          return JSON.stringify([
            { description: "Schedule AC repair", category: "service-call", urgency: 1 },
          ]);
        }
        return "Thank you for reaching out!";
      }),
    };

    deps = makeDeps({
      claude: failingClaude,
      fetchMessages: vi.fn().mockResolvedValue([okEmail, failEmail, okEmail2]),
    });

    const result = await processNewEmails(deps);

    expect(result.errors).toBe(1);
    expect(result.errorDetails).toHaveLength(1);
    expect(result.errorDetails[0].emailId).toBe("msg-fail");
    expect(result.errorDetails[0].error).toBe("Claude API rate limit exceeded");
    // The other two emails still processed successfully
    expect(result.processed).toBe(2);
  });

  it("returns correct ProcessResult counts for mixed batch", async () => {
    const emails = [
      makeRawEmail({ id: "msg-ok" }),
      makeRawEmail({
        id: "msg-no-match",
        from: "nobody@unknown.com",
        to: "nobody@unknown.com",
        subject: "No match",
        body: "Unrelated email",
      }),
    ];

    deps = makeDeps({
      fetchMessages: vi.fn().mockResolvedValue(emails),
    });

    // Pre-process one to get a skip
    // Mark msg-ok as already processed in the processed_emails table
    deps.db.markEmailProcessed("msg-ok", "processed");

    const result = await processNewEmails(deps);
    expect(result.skipped).toBe(1);   // msg-ok was already processed
    expect(result.unmatched).toBe(1);  // msg-no-match
    expect(result.processed).toBe(0);
    expect(result.errors).toBe(0);
  });
});
