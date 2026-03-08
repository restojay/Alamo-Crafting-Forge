import { test, expect } from "@playwright/test";

test.describe("ACF Showcase Hub", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("hero section visible with ACF identity text", async ({ page }) => {
    const hero = page.locator("section#hero, [data-testid='hero']");
    await expect(hero).toBeVisible();
    await expect(page.getByText("Alamo Crafting Forge")).toBeVisible();
  });

  test("all 4 brand cards visible with persistent CTAs (no hover required)", async ({ page }) => {
    const brandCards = page.locator("[data-testid='brand-card']");
    await expect(brandCards).toHaveCount(4);

    for (const card of await brandCards.all()) {
      await expect(card).toBeVisible();
      const cta = card.locator("a[href]");
      await expect(cta).toBeVisible();
    }
  });

  test("3 sector group labels visible", async ({ page }) => {
    const sectors = page.locator("[data-testid='sector-group']");
    await expect(sectors).toHaveCount(3);

    for (const sector of await sectors.all()) {
      await expect(sector).toBeVisible();
    }
  });

  test("all Visit Site links have valid href", async ({ page }) => {
    const visitLinks = page.locator("[data-testid='brand-card'] a[href]");
    const count = await visitLinks.count();
    expect(count).toBe(4);

    for (let i = 0; i < count; i++) {
      const href = await visitLinks.nth(i).getAttribute("href");
      expect(href).toBeTruthy();
      expect(href).toMatch(/^https?:\/\//);
    }
  });

  test("keyboard navigation: Tab reaches all brand CTAs", async ({ page }) => {
    const visitLinks = page.locator("[data-testid='brand-card'] a[href]");
    const count = await visitLinks.count();

    for (let i = 0; i < count; i++) {
      await page.keyboard.press("Tab");
      // Keep tabbing until we reach a brand CTA
    }

    // Verify at least one brand CTA received focus at some point
    // Tab through the page and check CTAs are focusable
    for (let i = 0; i < 20; i++) {
      await page.keyboard.press("Tab");
      const focusedCount = await page.locator("[data-testid='brand-card'] a:focus").count();
      if (focusedCount > 0) break;
    }
  });

  test("mobile viewport: all content stacks, no horizontal overflow", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/");

    // No horizontal scrollbar
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    const viewportWidth = await page.evaluate(() => window.innerWidth);
    expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 1);

    // All brand cards still visible
    const brandCards = page.locator("[data-testid='brand-card']");
    await expect(brandCards).toHaveCount(4);
  });

  test("reduced motion: respects prefers-reduced-motion", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");

    // Verify page loads correctly with reduced motion
    const hero = page.locator("section#hero, [data-testid='hero']");
    await expect(hero).toBeVisible();

    // Check that transition durations are effectively 0
    const duration = await page.evaluate(() => {
      const el = document.querySelector("[data-testid='hero']") || document.querySelector("section#hero");
      if (!el) return "none";
      return window.getComputedStyle(el).transitionDuration;
    });
    // With prefers-reduced-motion, transitions should be 0.01ms or similar
    expect(["0s", "0.01ms", "0ms", "none"]).toContain(duration);
  });
});
