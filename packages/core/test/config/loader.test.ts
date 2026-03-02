import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { validateConfig } from "../../src/config/schema.js";
import { loadConfigs } from "../../src/config/loader.js";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function validConfigData() {
  return {
    id: "sunny-side-hvac",
    name: "Sunny Side HVAC",
    sector: "Services",
    email: {
      inbound: "info@sunnysidehvac.com",
      smtp: "smtp.gmail.com",
      credentialKey: "SUNNY_SIDE_GMAIL_KEY",
      pollIntervalMinutes: 5,
    },
    agent: {
      businessContext: "HVAC contractor in San Antonio",
      tone: "professional and friendly",
      faq: [
        { question: "What are your hours?", answer: "Mon-Sat 8am-6pm" },
        { question: "Do you offer emergency service?", answer: "Yes, 24/7 emergency available" },
      ],
      services: ["AC Repair", "Furnace Installation", "HVAC Maintenance"],
    },
    operations: {
      businessHours: "Mon-Sat 8am-6pm",
      escalationContact: "info@sunnysidehvac.com",
      slaOverrides: { booking: 60 },
      taskRoutingDefaults: { billing: "admin@sunnysidehvac.com" },
    },
    tasks: {
      recurring: [{ label: "Weekly supply check", cron: "0 9 * * MON" }],
      categories: ["service-call", "inquiry", "complaint"],
    },
    webhooks: [
      { event: "booking.created", url: "https://hooks.sunnysidehvac.com/booking" },
    ],
  };
}

// ---------------------------------------------------------------------------
// validateConfig — schema unit tests
// ---------------------------------------------------------------------------

describe("validateConfig", () => {
  it("accepts a fully valid config", () => {
    const result = validateConfig(validConfigData());
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.config.id).toBe("sunny-side-hvac");
      expect(result.config.operations.businessHours).toBe("Mon-Sat 8am-6pm");
      expect(result.config.agent.faq).toHaveLength(2);
    }
  });

  it("accepts minimal config (empty arrays, no optionals)", () => {
    const minimal = {
      id: "min",
      name: "Minimal",
      sector: "Test",
      email: {
        inbound: "a@b.com",
        smtp: "smtp.test.com",
        credentialKey: "KEY",
        pollIntervalMinutes: 1,
      },
      agent: { businessContext: "", tone: "", faq: [], services: [] },
      operations: { businessHours: "", escalationContact: "" },
      tasks: { recurring: [], categories: [] },
      webhooks: [],
    };
    const result = validateConfig(minimal);
    expect(result.valid).toBe(true);
  });

  // -- Missing required fields --

  it("rejects config missing id", () => {
    const data = validConfigData();
    delete (data as any).id;
    const result = validateConfig(data);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.errors.some((e) => e.includes("id"))).toBe(true);
    }
  });

  it("rejects config missing entire email block", () => {
    const data = validConfigData();
    delete (data as any).email;
    const result = validateConfig(data);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.errors.some((e) => e.includes("email"))).toBe(true);
    }
  });

  it("rejects config missing operations block", () => {
    const data = validConfigData();
    delete (data as any).operations;
    const result = validateConfig(data);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.errors.some((e) => e.includes("operations"))).toBe(true);
    }
  });

  // -- Invalid email format --

  it("rejects invalid inbound email address", () => {
    const data = validConfigData();
    data.email.inbound = "not-an-email";
    const result = validateConfig(data);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.errors.some((e) => e.includes("email.inbound"))).toBe(true);
    }
  });

  // -- Invalid pollIntervalMinutes --

  it("rejects non-integer pollIntervalMinutes", () => {
    const data = validConfigData();
    data.email.pollIntervalMinutes = 2.5;
    const result = validateConfig(data);
    expect(result.valid).toBe(false);
  });

  it("rejects zero pollIntervalMinutes", () => {
    const data = validConfigData();
    data.email.pollIntervalMinutes = 0;
    const result = validateConfig(data);
    expect(result.valid).toBe(false);
  });

  it("rejects pollIntervalMinutes above 60", () => {
    const data = validConfigData();
    data.email.pollIntervalMinutes = 61;
    const result = validateConfig(data);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.errors.some((e) => e.includes("pollIntervalMinutes"))).toBe(true);
    }
  });

  // -- FAQ structure validation --

  it("rejects faq items that are strings instead of objects", () => {
    const data = validConfigData();
    (data.agent as any).faq = ["What are your hours?"];
    const result = validateConfig(data);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.errors.some((e) => e.includes("faq"))).toBe(true);
    }
  });

  it("rejects faq objects missing the answer field", () => {
    const data = validConfigData();
    (data.agent as any).faq = [{ question: "Hours?" }];
    const result = validateConfig(data);
    expect(result.valid).toBe(false);
  });

  // -- Operations block validation --

  it("validates slaOverrides values must be numbers", () => {
    const data = validConfigData();
    (data.operations as any).slaOverrides = { booking: "fast" };
    const result = validateConfig(data);
    expect(result.valid).toBe(false);
  });

  it("validates taskRoutingDefaults values must be strings", () => {
    const data = validConfigData();
    (data.operations as any).taskRoutingDefaults = { billing: 42 };
    const result = validateConfig(data);
    expect(result.valid).toBe(false);
  });

  // -- Webhooks validation --

  it("accepts webhooks with valid URLs", () => {
    const data = validConfigData();
    data.webhooks = [
      { event: "booking.created", url: "https://hooks.example.com/new" },
    ];
    const result = validateConfig(data);
    expect(result.valid).toBe(true);
  });

  it("rejects webhooks with invalid URLs", () => {
    const data = validConfigData();
    (data as any).webhooks = [
      { event: "booking.created", url: "not-a-url" },
    ];
    const result = validateConfig(data);
    expect(result.valid).toBe(false);
  });

  it("accepts config with webhooks omitted entirely", () => {
    const data = validConfigData();
    delete (data as any).webhooks;
    const result = validateConfig(data);
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.config.webhooks).toBeUndefined();
    }
  });

  // -- Return shape --

  it("returns errors as string array, not thrown exception", () => {
    const result = validateConfig({});
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(Array.isArray(result.errors)).toBe(true);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(typeof result.errors[0]).toBe("string");
    }
  });
});

// ---------------------------------------------------------------------------
// loadConfigs — integration tests using temp directory
// ---------------------------------------------------------------------------

describe("loadConfigs", () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), "servicebot-config-test-"));
  });

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true });
  });

  async function writeConfigFile(name: string, content: string) {
    await writeFile(join(tmpDir, name), content, "utf-8");
  }

  it("loads a valid config file", async () => {
    const data = validConfigData();
    await writeConfigFile(
      "sample-hvac.config.ts",
      `export default ${JSON.stringify(data)};`,
    );

    const result = await loadConfigs(tmpDir);
    expect(result.configs).toHaveLength(1);
    expect(result.configs[0].id).toBe("sunny-side-hvac");
    expect(result.errors).toHaveLength(0);
  });

  it("reports invalid config files without crashing", async () => {
    // Valid file
    const data = validConfigData();
    await writeConfigFile(
      "good.config.ts",
      `export default ${JSON.stringify(data)};`,
    );

    // Invalid file (missing required fields)
    await writeConfigFile(
      "bad.config.ts",
      `export default { id: "bad" };`,
    );

    const result = await loadConfigs(tmpDir);
    expect(result.configs).toHaveLength(1);
    expect(result.configs[0].id).toBe("sunny-side-hvac");
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].file).toBe("bad.config.ts");
    expect(result.errors[0].messages.length).toBeGreaterThan(0);
  });

  it("handles import errors gracefully", async () => {
    await writeConfigFile("broken.config.ts", "export default (() => { throw new Error('boom'); })();");

    const result = await loadConfigs(tmpDir);
    expect(result.configs).toHaveLength(0);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].file).toBe("broken.config.ts");
    expect(result.errors[0].messages[0]).toContain("Import failed");
  });

  it("ignores non-.config.ts files", async () => {
    const data = validConfigData();
    await writeConfigFile(
      "sample-hvac.config.ts",
      `export default ${JSON.stringify(data)};`,
    );
    await writeConfigFile("readme.txt", "This is not a config file");
    await writeConfigFile("utils.ts", "export const x = 1;");

    const result = await loadConfigs(tmpDir);
    expect(result.configs).toHaveLength(1);
    expect(result.errors).toHaveLength(0);
  });

  it("returns empty result for directory with no config files", async () => {
    const result = await loadConfigs(tmpDir);
    expect(result.configs).toHaveLength(0);
    expect(result.errors).toHaveLength(0);
  });
});
