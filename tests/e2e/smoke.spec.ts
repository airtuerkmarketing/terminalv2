import { test, expect } from "@playwright/test";

/**
 * Demo blast-radius smoke flows (D-096). Stable locators only — existing
 * classes / roles / hrefs (no test-ids needed). Runs authenticated via the
 * storageState from auth.setup.ts.
 *
 * Fixture: `business-development/dvjvnd` is a public Document-Library folder
 * with one file (id 6ec92efb-…). If the seed data changes, update FOLDER.
 */
const FOLDER = "/documents-library/business-development/dvjvnd";

test.describe("demo-critical smoke", () => {
  test("home renders with the AI search box", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator(".ai-search-textarea")).toBeVisible();
  });

  test("documents library folder shows a servable file", async ({ page }) => {
    await page.goto(FOLDER);
    await expect(page.locator('a[href*="/api/library/file/"]').first()).toBeVisible();
  });

  test("opening a file returns a signed-URL redirect, not an error", async ({ page }) => {
    await page.goto(FOLDER);
    const link = page.locator('a[href*="/api/library/file/"]').first();
    await expect(link).toBeVisible();
    const href = await link.getAttribute("href");
    expect(href).toContain("/api/library/file/");
    const res = await page.request.get(href!, { maxRedirects: 0 });
    expect([302, 307]).toContain(res.status()); // 302 → signed storage URL
  });

  test("ask the AI a question → a streamed answer appears", async ({ page }) => {
    await page.goto("/");
    const input = page.locator(".ai-search-textarea");
    await input.fill("Was bietet airtuerk?");
    await input.press("Enter");
    const answer = page.locator(".ai-chat-answer").first();
    await expect(answer).toBeVisible({ timeout: 25_000 }); // RAG warm TTFB ~3s
    await expect(answer).not.toBeEmpty({ timeout: 25_000 });
  });

  test("logout returns to /login", async ({ page }) => {
    await page.goto("/");
    await page.locator("button.user-block").click();
    await page.getByRole("menuitem", { name: /sign out/i }).click();
    await page.waitForURL(/\/login/, { timeout: 15_000 });
  });
});
