import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { registerClientFromConfig } from "../../src/onboarding/register-client.js";
import { ServiceBotDatabase } from "../../src/db/database.js";

const validConfig = {
  id: "sunny-side-hvac",
  name: "Sunny Side HVAC",
  sector: "Services",
  email: {
    inbound: "info@sunnysidehvac.com",
    smtp: "smtp.gmail.com",
    credentialKey: "SUNNY_SIDE",
    pollIntervalMinutes: 5,
  },
  agent: {
    businessContext: "HVAC services",
    tone: "Professional and friendly",
    faq: [],
    services: ["AC Repair", "Furnace Installation"],
  },
  operations: {
    businessHours: "Mon-Fri 8-5",
    escalationContact: "admin@sunnysidehvac.com",
  },
  tasks: { recurring: [], categories: ["general"] },
};

describe("registerClientFromConfig", () => {
  let db: ServiceBotDatabase;

  beforeEach(() => {
    db = new ServiceBotDatabase(":memory:");
  });
  afterEach(() => {
    db.close();
  });

  it("registers valid config and returns client ID", async () => {
    const result = await registerClientFromConfig({
      config: validConfig,
      db,
      now: () => new Date("2026-03-02T12:00:00Z"),
    });
    expect(result.clientId).toBe("sunny-side-hvac");
    expect(result.created).toBe(true);
  });

  it("is idempotent for duplicate registrations", async () => {
    await registerClientFromConfig({
      config: validConfig,
      db,
      now: () => new Date("2026-03-02T12:00:00Z"),
    });
    const result = await registerClientFromConfig({
      config: validConfig,
      db,
      now: () => new Date("2026-03-02T12:00:00Z"),
    });
    expect(result.created).toBe(false);
    expect(result.clientId).toBe("sunny-side-hvac");
  });

  it("returns validation errors for invalid config", async () => {
    await expect(
      registerClientFromConfig({
        config: { id: "" },
        db,
        now: () => new Date(),
      }),
    ).rejects.toThrow(/validation/i);
  });

  it("creates audit entry on registration", async () => {
    await registerClientFromConfig({
      config: validConfig,
      db,
      now: () => new Date("2026-03-02T12:00:00Z"),
    });
    // Verify sync state was saved
    const state = db.getSyncState("client:sunny-side-hvac");
    expect(state).toBeDefined();
    expect(JSON.parse(state!).name).toBe("Sunny Side HVAC");
  });

  it("syncs registered client to subsidiaries table", async () => {
    await registerClientFromConfig({
      config: validConfig,
      db,
      now: () => new Date("2026-03-02T12:00:00Z"),
    });
    const subsidiaries = db.listSubsidiaries();
    expect(subsidiaries).toHaveLength(1);
    expect(subsidiaries[0].id).toBe(validConfig.id);
  });
});
