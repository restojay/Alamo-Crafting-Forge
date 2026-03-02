import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { ServiceBotDatabase, registerClientFromConfig } from "@servicebot/core";

const validConfig = {
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
    businessContext: "Test business",
    tone: "Professional",
    faq: [],
    services: ["Service A"],
  },
  operations: {
    businessHours: "Mon-Fri 9-5",
    escalationContact: "admin@test.com",
  },
  tasks: { recurring: [], categories: ["general"] },
};

describe("CLI register-client (core logic)", () => {
  let db: ServiceBotDatabase;

  beforeEach(() => {
    db = new ServiceBotDatabase(":memory:");
  });
  afterEach(() => {
    db.close();
  });

  it("registers a new client from valid config", async () => {
    const result = await registerClientFromConfig({
      config: validConfig,
      db,
      now: () => new Date("2026-03-02T12:00:00Z"),
    });
    expect(result.created).toBe(true);
    expect(result.clientId).toBe("test-client");
  });

  it("reports already registered on duplicate", async () => {
    await registerClientFromConfig({ config: validConfig, db, now: () => new Date() });
    const result = await registerClientFromConfig({ config: validConfig, db, now: () => new Date() });
    expect(result.created).toBe(false);
  });

  it("rejects invalid config", async () => {
    await expect(
      registerClientFromConfig({ config: {}, db, now: () => new Date() }),
    ).rejects.toThrow(/validation/i);
  });
});
