import { describe, it, expect } from "vitest";
import { matchEmailToSubsidiary } from "../../src/email/matcher/subsidiary-matcher.js";
import type { ParsedEmail } from "../../src/email/types.js";
import type { SubsidiaryConfig } from "../../src/config/types.js";

const sunnySide: SubsidiaryConfig = {
  id: "sunny-side-hvac",
  name: "Sunny Side HVAC",
  sector: "Services",
  email: {
    inbound: "info@sunnysidehvac.com",
    smtp: "smtp.gmail.com",
    credentialKey: "SUNNY_SIDE",
    pollIntervalMinutes: 3,
  },
  agent: {
    businessContext: "HVAC contractor",
    tone: "Professional and friendly",
    faq: [],
    services: ["AC Repair", "Furnace Installation", "HVAC Maintenance"],
  },
  operations: {
    businessHours: "Mon-Sat 8-6",
    escalationContact: "info@sunnysidehvac.com",
  },
  tasks: {
    recurring: [],
    categories: ["service-call", "complaint"],
  },
  webhooks: [],
};

const acfDice: SubsidiaryConfig = {
  id: "acf-dice",
  name: "ACF Dice",
  sector: "E-Commerce",
  email: {
    inbound: "orders@acfdice.com",
    smtp: "smtp.gmail.com",
    credentialKey: "DICE",
    pollIntervalMinutes: 5,
  },
  agent: {
    businessContext: "Custom dice",
    tone: "Friendly",
    faq: [],
    services: ["Custom Dice Set", "Wholesale"],
  },
  operations: {
    businessHours: "Mon-Fri 9-5",
    escalationContact: "support@acfdice.com",
  },
  tasks: {
    recurring: [],
    categories: ["order-inquiry", "wholesale"],
  },
  webhooks: [],
};

function makeEmail(overrides: Partial<ParsedEmail> = {}): ParsedEmail {
  return {
    id: "1",
    threadId: "t1",
    from: { name: "Jane", email: "jane@test.com" },
    to: { name: "Support", email: "support@test.com" },
    subject: "Hello",
    bodyText: "General question",
    receivedAt: new Date().toISOString(),
    hasAttachments: false,
    labels: [],
    ...overrides,
  };
}

describe("matchEmailToSubsidiary", () => {
  it("matches high confidence by name in subject", () => {
    const email = makeEmail({ subject: "Question about Sunny Side HVAC" });
    const result = matchEmailToSubsidiary(email, [sunnySide, acfDice]);
    expect(result.confidence).toBe("high");
    expect(result.subsidiaryId).toBe("sunny-side-hvac");
  });

  it("matches medium confidence by service keyword in body", () => {
    const email = makeEmail({ bodyText: "How much for Furnace Installation?" });
    const result = matchEmailToSubsidiary(email, [sunnySide, acfDice]);
    expect(result.confidence).toBe("medium");
    expect(result.subsidiaryId).toBe("sunny-side-hvac");
  });

  it("matches service keyword in subject too", () => {
    const email = makeEmail({ subject: "Custom Dice Set pricing" });
    const result = matchEmailToSubsidiary(email, [sunnySide, acfDice]);
    expect(result.confidence).toBe("medium");
    expect(result.subsidiaryId).toBe("acf-dice");
  });

  it("matches medium confidence by email domain", () => {
    const email = makeEmail({
      from: { name: "Client", email: "client@sunnysidehvac.com" },
      subject: "Quick question",
      bodyText: "Nothing specific here",
    });
    const result = matchEmailToSubsidiary(email, [sunnySide, acfDice]);
    expect(result.confidence).toBe("medium");
    expect(result.subsidiaryId).toBe("sunny-side-hvac");
  });

  it("returns low confidence when no match", () => {
    const email = makeEmail({
      subject: "Random question",
      bodyText: "Nothing specific",
    });
    const result = matchEmailToSubsidiary(email, [sunnySide, acfDice]);
    expect(result.confidence).toBe("low");
    expect(result.subsidiaryId).toBeUndefined();
  });

  it("infers appointment request type", () => {
    const email = makeEmail({ subject: "Booking request" });
    const result = matchEmailToSubsidiary(email, [sunnySide]);
    expect(result.requestType).toBe("appointment");
  });

  it("infers order request type", () => {
    const email = makeEmail({ bodyText: "Where is my order?" });
    const result = matchEmailToSubsidiary(email, [sunnySide]);
    expect(result.requestType).toBe("order");
  });

  it("infers support request type", () => {
    const email = makeEmail({ bodyText: "I need help with something" });
    const result = matchEmailToSubsidiary(email, [sunnySide]);
    expect(result.requestType).toBe("support");
  });

  it("infers bug request type", () => {
    const email = makeEmail({ subject: "Bug in the checkout" });
    const result = matchEmailToSubsidiary(email, [sunnySide]);
    expect(result.requestType).toBe("bug");
  });

  it("infers feature request type", () => {
    const email = makeEmail({ subject: "Feature suggestion for the site" });
    const result = matchEmailToSubsidiary(email, [sunnySide]);
    expect(result.requestType).toBe("feature");
  });

  it("defaults to inquiry for unclassified", () => {
    const email = makeEmail({
      subject: "Hello",
      bodyText: "Just wanted to say hi",
    });
    const result = matchEmailToSubsidiary(email, [sunnySide]);
    expect(result.requestType).toBe("inquiry");
  });

  it("prioritizes name match over service keyword match", () => {
    const email = makeEmail({
      subject: "ACF Dice AC Repair",
      bodyText: "I need AC repair",
    });
    const result = matchEmailToSubsidiary(email, [sunnySide, acfDice]);
    expect(result.confidence).toBe("high");
    expect(result.subsidiaryId).toBe("acf-dice");
  });

  it("handles empty config list gracefully", () => {
    const email = makeEmail({ subject: "Hello" });
    const result = matchEmailToSubsidiary(email, []);
    expect(result.confidence).toBe("low");
    expect(result.subsidiaryId).toBeUndefined();
  });

  it("matches domain case-insensitively (RFC 5321)", () => {
    const email = makeEmail({
      from: { name: "Client", email: "Client@SUNNYSIDEHVAC.COM" },
      subject: "Quick question",
      bodyText: "Nothing specific here",
    });
    const result = matchEmailToSubsidiary(email, [sunnySide, acfDice]);
    expect(result.confidence).toBe("medium");
    expect(result.subsidiaryId).toBe("sunny-side-hvac");
  });

  it("does not match email from similar domain (suffix attack)", () => {
    const email = makeEmail({
      from: { name: "Attacker", email: "user@notsunnysidehvac.com" },
      subject: "Quick question",
      bodyText: "Nothing specific here",
    });
    const result = matchEmailToSubsidiary(email, [sunnySide, acfDice]);
    // Should NOT match sunny-side — "notsunnysidehvac.com" !== "sunnysidehvac.com"
    expect(result.subsidiaryId).toBeUndefined();
    expect(result.confidence).toBe("low");
  });
});
