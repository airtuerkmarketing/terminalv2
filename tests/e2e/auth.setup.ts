import { test as setup } from "@playwright/test";
import * as fs from "node:fs";

const authFile = "tests/e2e/.auth/user.json";

/**
 * Logs in once with the dedicated preview account and persists the session so
 * the smoke tests run authenticated. Email/password come from env
 * (TEST_USER_EMAIL / TEST_USER_PASSWORD) — never hard-coded.
 */
setup("authenticate", async ({ page }) => {
  const email = process.env.TEST_USER_EMAIL;
  const password = process.env.TEST_USER_PASSWORD;
  if (!email || !password) {
    throw new Error("Set TEST_USER_EMAIL and TEST_USER_PASSWORD (see CLAUDE.local.md / CI secrets).");
  }

  await page.goto("/login");
  await page.locator("input#email").fill(email);
  await page.locator("input#password").fill(password);
  await page.locator("button.auth-submit").click();
  // Land anywhere that isn't /login (home, or force-password if seeded).
  await page.waitForURL((url) => !url.pathname.startsWith("/login"), { timeout: 20_000 });

  fs.mkdirSync("tests/e2e/.auth", { recursive: true });
  await page.context().storageState({ path: authFile });
});
