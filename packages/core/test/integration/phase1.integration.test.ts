import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  ServiceBotDatabase,
  parseEmail,
  matchEmailToSubsidiary,
  classifyEmail,
  extractActionItems,
  generateDraft,
  computeDedupeHash,
} from "../../src/index.js";
import type {
  ClaudeClient,
  SubsidiaryConfig,
  RawEmail,
} from "../../src/index.js";
import { processNewEmails } from "../../../../service/src/index.js";

// ── Fixture Builders ────────────────────────────────────────────

function makeSubsidiaryConfig(
  overrides: Partial<SubsidiaryConfig> = {},
): SubsidiaryConfig {
  return {
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
        { question: "What are your hours?", answer: "Mon-Sat 8am-6pm, 24/7 emergency." },
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
    ...overrides,
  };
}

function makeRawEmail(overrides: Partial<RawEmail> = {}): RawEmail {
  return {
    id: "msg-int-001",
    threadId: "thread-int-001",
    from: "Maria Garcia <maria@example.com>",
    to: "Sunny Side HVAC <info@sunnysidehvac.com>",
    subject: "Sunny Side HVAC service call this Saturday?",
    body: "Hi, I'd like to schedule an AC repair this Saturday morning. Any openings? Thanks!",
    date: "2026-03-01T10:00:00Z",
    hasAttachments: false,
    labels: ["INBOX", "UNREAD"],
    ...overrides,
  };
}

function makeMockClaude(): ClaudeClient {
  return {
    complete: vi.fn().mockImplementation(async (systemPrompt: string) => {
      if (systemPrompt.includes("triage agent")) {
        return JSON.stringify({
          category: "service-call",
          urgency: "medium",
          summary: "Customer wants a Saturday AC repair appointment",
        });
      }
      if (systemPrompt.includes("task extraction")) {
        return JSON.stringify([
          {
            description: "Schedule AC repair appointment for Saturday morning",
            category: "service-call",
            urgency: 1,
          },
        ]);
      }
      // draft generation
      return "Hi Maria! We'd love to help with your AC repair this Saturday. We have openings at 10am and 11:30am. Would either work for you?";
    }),
  };
}

// ── Integration Tests ───────────────────────────────────────────

describe("ServiceBot Phase 1 E2E", () => {
  let db: ServiceBotDatabase;

  beforeEach(() => {
    db = new ServiceBotDatabase(":memory:");
  });

  afterEach(() => {
    db.close();
  });

  it("processes email through full pipeline with DB state verification", async () => {
    const raw = makeRawEmail();
    const config = makeSubsidiaryConfig();
    const claude = makeMockClaude();

    // Step 1: Parse
    const parsed = parseEmail(raw);
    expect(parsed.from.email).toBe("maria@example.com");
    expect(parsed.from.name).toBe("Maria Garcia");
    expect(parsed.bodyText).toContain("AC repair this Saturday");
    expect(parsed.receivedAt).toBeDefined();
    expect(parsed.hasAttachments).toBe(false);
    expect(parsed.labels).toContain("INBOX");

    // Step 2: Match to subsidiary
    const match = matchEmailToSubsidiary(parsed, [config]);
    expect(match.subsidiaryId).toBe("sunny-side-hvac");
    expect(match.confidence).toBeDefined();

    // Step 3: Classify
    const classification = await classifyEmail(claude, parsed, config);
    expect(classification.category).toBe("service-call");
    expect(classification.urgency).toBe("medium");
    expect(classification.summary).toBeDefined();

    // Step 4: Extract action items
    const actions = await extractActionItems(claude, parsed, config);
    expect(actions).toHaveLength(1);
    expect(actions[0].description).toContain("AC repair");
    expect(actions[0].category).toBe("service-call");
    expect(actions[0].urgency).toBe(1);

    // Step 5: Generate draft
    const draftBody = await generateDraft(claude, parsed, config, classification);
    expect(draftBody).toContain("Saturday");

    // Step 6: Save to DB — all required fields
    const now = new Date().toISOString();
    const ticketId = "ticket-e2e-001";

    db.saveTicket({
      id: ticketId,
      subsidiaryId: match.subsidiaryId!,
      emailId: raw.id,
      subject: parsed.subject,
      customerEmail: parsed.from.email,
      customerName: parsed.from.name,
      status: "open",
      createdAt: now,
      updatedAt: now,
    });

    db.saveContact({
      id: "contact-e2e-001",
      subsidiaryId: match.subsidiaryId!,
      email: parsed.from.email,
      name: parsed.from.name,
      createdAt: now,
    });

    for (const action of actions) {
      const hash = computeDedupeHash(match.subsidiaryId!, action.description, action.category);
      db.saveTask({
        id: "task-e2e-001",
        ticketId,
        subsidiaryId: match.subsidiaryId!,
        category: action.category,
        state: "new",
        description: action.description,
        urgency: action.urgency,
        dedupeHash: hash,
        createdAt: now,
        updatedAt: now,
      });
    }

    db.saveDraft({
      id: "draft-e2e-001",
      ticketId,
      body: draftBody,
      approved: 0,
      createdAt: now,
    });

    db.saveAuditEntry({
      entityType: "ticket",
      entityId: ticketId,
      action: "processed",
      payloadJson: JSON.stringify(classification),
    });

    db.saveSyncState("last_processed_email", raw.id);

    // Step 6b: Mark email as processed (mirrors service runner behavior)
    db.markEmailProcessed(raw.id, "processed");

    // Step 7: Verify DB state
    expect(db.isEmailProcessed(raw.id)).toBe(true);

    const ticket = db.getTicket(ticketId);
    expect(ticket).toBeDefined();
    expect(ticket!.subsidiaryId).toBe("sunny-side-hvac");
    expect(ticket!.customerEmail).toBe("maria@example.com");
    expect(ticket!.customerName).toBe("Maria Garcia");
    expect(ticket!.status).toBe("open");

    const tasks = db.getTasksByTicket(ticketId);
    expect(tasks).toHaveLength(1);
    expect(tasks[0].dedupeHash).toBeDefined();
    expect(tasks[0].subsidiaryId).toBe("sunny-side-hvac");

    const drafts = db.getDraftsByTicket(ticketId);
    expect(drafts).toHaveLength(1);
    expect(drafts[0].approved).toBe(0);
    expect(drafts[0].body).toContain("Saturday");

    expect(db.getSyncState("last_processed_email")).toBe(raw.id);
  });

  it("handles Claude timeout gracefully", async () => {
    const config = makeSubsidiaryConfig();
    const timeoutClaude: ClaudeClient = {
      complete: vi.fn().mockRejectedValue(new Error("Request timeout")),
    };

    const raw = makeRawEmail({ id: "msg-timeout-001" });

    const result = await processNewEmails({
      db,
      configs: [config],
      claude: timeoutClaude,
      fetchMessages: vi.fn().mockResolvedValue([raw]),
      logger: { error: vi.fn() },
    });

    // Error should be tracked
    expect(result.errors).toBe(1);
    expect(result.errorDetails).toHaveLength(1);
    expect(result.errorDetails[0].emailId).toBe("msg-timeout-001");
    expect(result.errorDetails[0].error).toBe("Request timeout");
    expect(result.processed).toBe(0);

    // Email should NOT be marked as processed (no ticket created)
    expect(db.isEmailProcessed("msg-timeout-001")).toBe(false);
  });

  it("handles messy real-world email format", () => {
    const messyRaw: RawEmail = {
      id: "msg-messy-001",
      threadId: "thread-messy-001",
      from: '"Roberto Martinez" <roberto.m@yahoo.com>',
      to: "info@sunnysidehvac.com",
      subject: "Re: RE: Fwd: service call question??",
      body: [
        "Hey! I need to reschedule my AC repair appointment.",
        "",
        "Can I come in next Tuesday instead?",
        "",
        "",
        "Sent from my iPhone",
        "",
        "> On Feb 28, 2026, at 3:15 PM, Sunny Side HVAC wrote:",
        "> Sure, we can help with that!",
        "> ",
        ">> Original message about appointment",
      ].join("\n"),
      date: "invalid-date-string",
      hasAttachments: false,
      labels: ["INBOX"],
    };

    const parsed = parseEmail(messyRaw);

    // Quoted name should be captured (with quotes, per regex behavior)
    expect(parsed.from.name).toBe('"Roberto Martinez"');
    expect(parsed.from.email).toBe("roberto.m@yahoo.com");

    // Body should be preserved (including messy parts)
    expect(parsed.bodyText).toContain("reschedule");
    expect(parsed.bodyText).toContain("Sent from my iPhone");

    // Invalid date should fall back to a valid ISO string
    expect(parsed.receivedAt).toBeDefined();
    const fallbackDate = new Date(parsed.receivedAt);
    expect(fallbackDate.getTime()).not.toBeNaN();

    // Subject preserved with all the Re/Fwd prefixes
    expect(parsed.subject).toBe("Re: RE: Fwd: service call question??");

    // Match by service keyword in body ("AC repair")
    const config = makeSubsidiaryConfig();
    const match = matchEmailToSubsidiary(parsed, [config]);
    expect(match.subsidiaryId).toBe("sunny-side-hvac");
    expect(match.requestType).toBe("appointment");
  });

  it("runs full processNewEmails pipeline end-to-end", async () => {
    const config = makeSubsidiaryConfig();

    const normalEmail = makeRawEmail({
      id: "msg-pipe-001",
      from: "Ana Lopez <ana@example.com>",
      subject: "Sunny Side HVAC furnace installation",
      body: "I'd like to schedule a furnace installation. What's available next week?",
    });

    const unmatchedEmail = makeRawEmail({
      id: "msg-pipe-002",
      from: "spammer@random.org",
      to: "nobody@nowhere.com",
      subject: "Win a free cruise!",
      body: "Click here to claim your prize. Limited time offer.",
    });

    const sequentialClaude: ClaudeClient = {
      complete: vi.fn().mockImplementation(async (systemPrompt: string) => {
        if (systemPrompt.includes("triage agent")) {
          return JSON.stringify({
            category: "service-call",
            urgency: "low",
            summary: "Customer wants furnace installation next week",
          });
        }
        if (systemPrompt.includes("task extraction")) {
          return JSON.stringify([
            {
              description: "Book furnace installation appointment",
              category: "service-call",
              urgency: 0,
            },
            {
              description: "Check technician availability next week",
              category: "follow-up",
              urgency: 1,
            },
          ]);
        }
        return "Hi Ana! We'd love to help with your furnace installation. Our technician has availability on Tuesday and Thursday next week.";
      }),
    };

    const result = await processNewEmails({
      db,
      configs: [config],
      claude: sequentialClaude,
      fetchMessages: vi.fn().mockResolvedValue([normalEmail, unmatchedEmail]),
      logger: { error: vi.fn() },
    });

    // Verify ProcessResult counts
    expect(result.processed).toBe(1);
    expect(result.unmatched).toBe(1);
    expect(result.skipped).toBe(0);
    expect(result.errors).toBe(0);
    expect(result.errorDetails).toHaveLength(0);

    // Verify DB: ticket exists
    const tickets = db.getOpenTickets("sunny-side-hvac");
    expect(tickets).toHaveLength(1);
    expect(tickets[0].customerEmail).toBe("ana@example.com");
    expect(tickets[0].subsidiaryId).toBe("sunny-side-hvac");
    expect(tickets[0].emailId).toBe("msg-pipe-001");

    // Verify DB: tasks exist (2 action items)
    const tasks = db.getTasksByTicket(tickets[0].id);
    expect(tasks).toHaveLength(2);
    const categories = tasks.map((t) => t.category).sort();
    expect(categories).toEqual(["follow-up", "service-call"]);

    // Verify DB: draft exists
    const drafts = db.getDraftsByTicket(tickets[0].id);
    expect(drafts).toHaveLength(1);
    expect(drafts[0].body).toContain("furnace installation");
    expect(drafts[0].approved).toBe(0);

    // Verify DB: sync state updated
    expect(db.getSyncState("last_processed_email")).toBe("msg-pipe-001");

    // Verify: unmatched email is marked as processed (prevents reprocessing)
    expect(db.isEmailProcessed("msg-pipe-002")).toBe(true);
  });
});
