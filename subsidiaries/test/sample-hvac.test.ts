import { describe, it, expect } from "vitest";
import { validateConfig } from "@servicebot/core/config/schema.js";
import sampleConfig from "../sunny-side-hvac.config.js";

describe("sunny-side-hvac config", () => {
  it("passes schema validation", () => {
    const result = validateConfig(sampleConfig);
    expect(result.valid).toBe(true);
  });

  it("has the correct id", () => {
    expect(sampleConfig.id).toBe("sunny-side-hvac");
  });

  it("has the correct name", () => {
    expect(sampleConfig.name).toBe("Sunny Side HVAC");
  });

  it("has the correct sector", () => {
    expect(sampleConfig.sector).toBe("hvac");
  });

  it("lists at least one service", () => {
    expect(sampleConfig.agent.services.length).toBeGreaterThan(0);
  });

  it("includes all 8 HVAC services", () => {
    const expected = [
      "AC Repair",
      "Furnace Installation",
      "HVAC Maintenance",
      "Duct Cleaning",
      "Heat Pump Service",
      "Thermostat Installation",
      "Indoor Air Quality",
      "Emergency Service",
    ];
    expect(sampleConfig.agent.services).toEqual(expected);
  });

  it("escalation contact is the business owner, not the CEO", () => {
    expect(sampleConfig.operations.escalationContact).toContain("Maria Santos");
    expect(sampleConfig.operations.escalationContact).not.toContain("Jay");
  });

  it("business context mentions ACF Designs as manager", () => {
    expect(sampleConfig.agent.businessContext).toContain("ACF Designs");
    expect(sampleConfig.agent.businessContext).toContain("client project");
  });
});
