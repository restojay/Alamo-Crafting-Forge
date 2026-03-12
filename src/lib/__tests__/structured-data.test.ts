import { describe, it, expect } from "vitest";
import { organizationSchema, localBusinessSchema, brandPageSchema } from "../structured-data";
import { brands } from "../brands";

describe("structured data", () => {
  it("organizationSchema returns valid JSON-LD", () => {
    const schema = organizationSchema();
    expect(schema["@context"]).toBe("https://schema.org");
    expect(schema["@type"]).toBe("Organization");
    expect(schema.name).toBe("Alamo Crafting Forge");
    expect(schema.url).toBe("https://alamocraftingforge.com");
  });

  it("localBusinessSchema includes address", () => {
    const schema = localBusinessSchema();
    expect(schema["@type"]).toBe("LocalBusiness");
    expect(schema.address.addressLocality).toBe("San Antonio");
    expect(schema.address.addressRegion).toBe("TX");
  });

  it("brandPageSchema includes brand data", () => {
    const schema = brandPageSchema(brands[0]);
    expect(schema["@type"]).toBe("Product");
    expect(schema.name).toBe("Forgepoint");
    expect(schema.brand.name).toBe("Alamo Crafting Forge");
  });
});
