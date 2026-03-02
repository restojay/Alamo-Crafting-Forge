import { describe, it, expect } from "vitest";
import { validateConfig } from "../../src/config/schema.js";

/**
 * Base config fixture with all required fields.
 * SMTP and webhooks are intentionally omitted — tests add them.
 */
const base = {
  id: "test-client",
  name: "Test Client",
  sector: "Services",
  email: {
    inbound: "info@test.com",
    smtp: "smtp.gmail.com",
    credentialKey: "TEST",
    pollIntervalMinutes: 5,
  },
  agent: {
    businessContext: "Test",
    tone: "Professional",
    faq: [],
    services: ["Service A"],
  },
  operations: {
    businessHours: "Mon-Fri 9-5",
    escalationContact: "admin@test.com",
  },
  tasks: {
    recurring: [],
    categories: ["general"],
  },
};

// ---------------------------------------------------------------------------
// SMTP config validation
// ---------------------------------------------------------------------------

describe("SMTP config validation", () => {
  it("accepts valid SMTP config", () => {
    const result = validateConfig({
      ...base,
      smtp: {
        host: "smtp.sendgrid.net",
        port: 587,
        secure: false,
        username: "u",
        passwordEnv: "SMTP_PASS",
        fromEmail: "ops@acf.com",
      },
    });
    expect(result.valid).toBe(true);
  });

  it("accepts SMTP config with optional fromName", () => {
    const result = validateConfig({
      ...base,
      smtp: {
        host: "smtp.sendgrid.net",
        port: 587,
        secure: false,
        username: "u",
        passwordEnv: "SMTP_PASS",
        fromEmail: "ops@acf.com",
        fromName: "ACF Designs",
      },
    });
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.config.smtp?.fromName).toBe("ACF Designs");
    }
  });

  it("rejects SMTP config missing host", () => {
    const result = validateConfig({
      ...base,
      smtp: {
        port: 587,
        secure: false,
        username: "u",
        passwordEnv: "SMTP_PASS",
        fromEmail: "ops@acf.com",
      },
    });
    expect(result.valid).toBe(false);
  });

  it("rejects SMTP config missing port", () => {
    const result = validateConfig({
      ...base,
      smtp: {
        host: "smtp.sendgrid.net",
        secure: false,
        username: "u",
        passwordEnv: "SMTP_PASS",
        fromEmail: "ops@acf.com",
      },
    });
    expect(result.valid).toBe(false);
  });

  it("rejects SMTP config with invalid fromEmail", () => {
    const result = validateConfig({
      ...base,
      smtp: {
        host: "smtp.sendgrid.net",
        port: 587,
        secure: false,
        username: "u",
        passwordEnv: "SMTP_PASS",
        fromEmail: "not-an-email",
      },
    });
    expect(result.valid).toBe(false);
  });

  it("accepts config with smtp omitted entirely", () => {
    const result = validateConfig(base);
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.config.smtp).toBeUndefined();
    }
  });
});

// ---------------------------------------------------------------------------
// Webhook config validation
// ---------------------------------------------------------------------------

describe("Webhook config validation", () => {
  it("accepts valid webhooks array", () => {
    const result = validateConfig({
      ...base,
      webhooks: [
        { event: "task.completed", url: "https://example.com/hook" },
      ],
    });
    expect(result.valid).toBe(true);
  });

  it("accepts webhooks with all optional fields", () => {
    const result = validateConfig({
      ...base,
      webhooks: [
        {
          event: "booking.created",
          url: "https://example.com/hook",
          secretEnv: "HOOK_SECRET",
          timeoutMs: 10000,
        },
      ],
    });
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.config.webhooks?.[0].secretEnv).toBe("HOOK_SECRET");
      expect(result.config.webhooks?.[0].timeoutMs).toBe(10000);
    }
  });

  it("defaults timeoutMs to 5000 when omitted", () => {
    const result = validateConfig({
      ...base,
      webhooks: [
        { event: "task.completed", url: "https://example.com/hook" },
      ],
    });
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.config.webhooks?.[0].timeoutMs).toBe(5000);
    }
  });

  it("rejects webhook with invalid event type", () => {
    const result = validateConfig({
      ...base,
      webhooks: [
        { event: "invalid.event", url: "https://example.com/hook" },
      ],
    });
    expect(result.valid).toBe(false);
  });

  it("rejects webhook with invalid URL", () => {
    const result = validateConfig({
      ...base,
      webhooks: [
        { event: "task.completed", url: "not-a-url" },
      ],
    });
    expect(result.valid).toBe(false);
  });

  it("rejects webhook with timeoutMs exceeding 15000", () => {
    const result = validateConfig({
      ...base,
      webhooks: [
        {
          event: "task.completed",
          url: "https://example.com/hook",
          timeoutMs: 20000,
        },
      ],
    });
    expect(result.valid).toBe(false);
  });

  it("accepts empty webhooks array", () => {
    const result = validateConfig({
      ...base,
      webhooks: [],
    });
    expect(result.valid).toBe(true);
  });

  it("accepts config with webhooks omitted entirely", () => {
    const result = validateConfig(base);
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.config.webhooks).toBeUndefined();
    }
  });

  it("accepts multiple webhooks for different events", () => {
    const result = validateConfig({
      ...base,
      webhooks: [
        { event: "task.completed", url: "https://example.com/tasks" },
        { event: "booking.created", url: "https://example.com/bookings" },
      ],
    });
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.config.webhooks).toHaveLength(2);
    }
  });
});
