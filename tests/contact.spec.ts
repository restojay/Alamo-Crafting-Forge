import { test, expect } from "@playwright/test";

test.describe("contact page", () => {
  test("contact form renders", async ({ page }) => {
    await page.goto("/contact");
    await expect(page.locator("h1")).toContainText("Get in Touch");
    await expect(page.locator('input[name="name"]')).toBeVisible();
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('textarea[name="message"]')).toBeVisible();
  });

  test("form validates required fields", async ({ page }) => {
    await page.goto("/contact");
    await page.locator('button[type="submit"]').click();
    const nameInput = page.locator('input[name="name"]');
    expect(await nameInput.evaluate((el: HTMLInputElement) => el.validity.valueMissing)).toBe(true);
  });
});
