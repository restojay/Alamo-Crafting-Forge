import { existsSync } from "fs";
import { join } from "path";
import { describe, it, expect } from "vitest";
import { brands, getBrandBySlug } from "../brands";

const SLUG_PATTERN = /^[a-z0-9-]+$/;
const PUBLIC_DIR = join(process.cwd(), "public");

describe("brands data model", () => {
  it("every brand has a unique slug", () => {
    const slugs = brands.map((b) => b.slug);
    const unique = new Set(slugs);
    expect(unique.size).toBe(slugs.length);
  });

  it("every slug is URL-safe", () => {
    for (const brand of brands) {
      expect(brand.slug, `brand "${brand.id}" slug is not URL-safe`).toMatch(SLUG_PATTERN);
    }
  });

  it("every brand has longDescription longer than 50 chars", () => {
    for (const brand of brands) {
      expect(
        brand.longDescription.length,
        `brand "${brand.id}" longDescription is too short`
      ).toBeGreaterThan(50);
    }
  });

  it("every brand has at least 3 processSteps", () => {
    for (const brand of brands) {
      expect(
        brand.processSteps.length,
        `brand "${brand.id}" has fewer than 3 processSteps`
      ).toBeGreaterThanOrEqual(3);
    }
  });

  it("every processStep has non-empty title and description", () => {
    for (const brand of brands) {
      for (const step of brand.processSteps) {
        expect(step.title.trim().length, `brand "${brand.id}" has a step with empty title`).toBeGreaterThan(0);
        expect(step.description.trim().length, `brand "${brand.id}" has a step with empty description`).toBeGreaterThan(0);
      }
    }
  });

  it("every brand has all required fields", () => {
    const requiredFields: Array<keyof typeof brands[0]> = [
      "id",
      "slug",
      "name",
      "tagline",
      "description",
      "longDescription",
      "image",
      "blueprintMeta",
      "processSteps",
      "ctaLabel",
      "ctaHref",
      "sector",
    ];
    for (const brand of brands) {
      for (const field of requiredFields) {
        expect(brand[field], `brand "${brand.id}" is missing field "${field}"`).toBeDefined();
      }
    }
  });

  it("every brand image path points to an existing file", () => {
    for (const brand of brands) {
      // image is a root-relative path like /brands/forgepoint.webp
      const filePath = join(PUBLIC_DIR, brand.image);
      expect(
        existsSync(filePath),
        `brand "${brand.id}" image not found at ${filePath}`
      ).toBe(true);
    }
  });
});

describe("getBrandBySlug", () => {
  it("returns the correct brand for a valid slug", () => {
    for (const brand of brands) {
      const result = getBrandBySlug(brand.slug);
      expect(result).toBeDefined();
      expect(result?.id).toBe(brand.id);
    }
  });

  it("returns undefined for an unknown slug", () => {
    expect(getBrandBySlug("does-not-exist")).toBeUndefined();
  });

  it("returns undefined for an empty string", () => {
    expect(getBrandBySlug("")).toBeUndefined();
  });
});
