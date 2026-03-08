import { describe, it, expect } from "vitest";
import type { SubsidiaryConfig } from "../src/config/types.js";
import type { TaskState, Ticket, Draft } from "../src/db/types.js";

describe("config types", () => {
  it("SubsidiaryConfig has all required fields", () => {
    const config: SubsidiaryConfig = {
      id: "test",
      name: "Test Business",
      sector: "Services",
      email: { inbound: "a@b.com", smtp: "smtp.gmail.com", credentialKey: "TEST_KEY", pollIntervalMinutes: 5 },
      agent: { businessContext: "Test biz", tone: "neutral", faq: [{ question: "Hours?", answer: "9-5" }], services: ["Service A"] },
      operations: { businessHours: "Mon-Fri 9-5", escalationContact: "boss@test.com" },
      tasks: { recurring: [{ label: "Weekly check", cron: "0 9 * * MON" }], categories: ["admin"] },
    };
    expect(config.id).toBe("test");
    expect(config.operations.businessHours).toBe("Mon-Fri 9-5");
    expect(config.agent.faq[0].question).toBe("Hours?");
  });

  it("SubsidiaryConfig allows optional webhook and smtp fields", () => {
    const config: SubsidiaryConfig = {
      id: "min", name: "Min", sector: "S",
      email: { inbound: "a@b.com", smtp: "s", credentialKey: "k", pollIntervalMinutes: 1 },
      agent: { businessContext: "", tone: "", faq: [], services: [] },
      operations: { businessHours: "", escalationContact: "" },
      tasks: { recurring: [], categories: [] },
      webhooks: [{ event: "booking.created", url: "https://hooks.example.com/booking" }],
      smtp: { host: "smtp.test.com", port: 587, secure: false, username: "u", passwordEnv: "P", fromEmail: "a@b.com" },
    };
    expect(config.webhooks![0].event).toBe("booking.created");
    expect(config.webhooks![0].url).toBe("https://hooks.example.com/booking");
    expect(config.smtp!.host).toBe("smtp.test.com");
  });
});

describe("db types", () => {
  it("TaskState includes all 5 valid states", () => {
    const states: TaskState[] = ["new", "in_progress", "awaiting_response", "done", "escalated"];
    expect(states).toHaveLength(5);
  });

  it("Ticket interface has SLA and assignment fields", () => {
    const ticket: Ticket = {
      id: "t1", subsidiaryId: "sunny-side-hvac", emailId: "e1", subject: "Test",
      customerEmail: "a@b.com", customerName: "Jane", status: "open",
      assignedTo: "staff@sunnysidehvac.com", slaDeadline: "2026-03-01T12:00:00Z",
      createdAt: "2026-03-01T00:00:00Z", updatedAt: "2026-03-01T00:00:00Z",
    };
    expect(ticket.assignedTo).toBe("staff@sunnysidehvac.com");
  });

  it("Draft interface supports approval workflow", () => {
    const draft: Draft = {
      id: "d1", ticketId: "t1", body: "Hello",
      approved: 0, createdAt: "2026-03-01T00:00:00Z",
    };
    expect(draft.approved).toBe(0);
    expect(draft.rejectedAt).toBeUndefined();
    expect(draft.editedBody).toBeUndefined();
    expect(draft.sentAt).toBeUndefined();
  });
});
