import { test, expect } from "@playwright/test";

test.describe("brand pages", () => {
  test("forgepoint page renders", async ({ page }) => {
    await page.goto("/brands/forgepoint");
    await expect(page.locator("h1")).toContainText("Forgepoint");
  });

  test("acf-dice page has process steps", async ({ page }) => {
    await page.goto("/brands/acf-dice");
    await expect(page.locator("text=Our Process")).toBeVisible();
  });

  test("brand page has JSON-LD", async ({ page }) => {
    await page.goto("/brands/realmforge");
    const jsonLd = await page.locator('script[type="application/ld+json"]').textContent();
    expect(jsonLd).toContain("Realmforge");
  });

  test("invalid slug returns 404", async ({ page }) => {
    const res = await page.goto("/brands/nonexistent-brand");
    expect(res?.status()).toBe(404);
  });

  test("homepage brand cards link to internal pages", async ({ page }) => {
    await page.goto("/");
    const links = await page.locator('a[href^="/brands/"]').all();
    expect(links.length).toBeGreaterThanOrEqual(4);
  });
});
