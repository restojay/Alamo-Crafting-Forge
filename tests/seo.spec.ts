import { test, expect } from "@playwright/test";

test.describe("SEO infrastructure", () => {
  test("robots.txt is served", async ({ page }) => {
    const res = await page.goto("/robots.txt");
    expect(res?.status()).toBe(200);
    const text = await res?.text();
    expect(text).toContain("Sitemap:");
    expect(text).toContain("Disallow: /admin/");
  });

  test("sitemap.xml contains brand routes", async ({ page }) => {
    const res = await page.goto("/sitemap.xml");
    expect(res?.status()).toBe(200);
    const text = await res?.text();
    expect(text).toContain("/brands/forgepoint");
    expect(text).toContain("/brands/acf-dice");
    expect(text).toContain("/about");
    expect(text).toContain("/contact");
  });

  test("homepage has JSON-LD structured data", async ({ page }) => {
    await page.goto("/");
    const jsonLd = await page.locator('script[type="application/ld+json"]').textContent();
    expect(jsonLd).toContain("Organization");
    expect(jsonLd).toContain("Alamo Crafting Forge");
  });
});
