import { defineConfig, devices } from "@playwright/test";

/**
 * E2E config for the demo-critical smoke flows (D-096). Runs against a deployed
 * URL (prod or a preview), not a local dev server — set E2E_BASE_URL to override.
 * An auth "setup" project logs in once and saves the session to
 * tests/e2e/.auth/user.json; the smoke project reuses it via storageState.
 *
 * Required env: TEST_USER_EMAIL, TEST_USER_PASSWORD (see CLAUDE.local.md / CI secrets).
 */
export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 45_000,
  expect: { timeout: 10_000 },
  fullyParallel: false, // demo flows are session-dependent
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: [["html", { open: "never" }], ["list"]],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "https://www.airtuerk.dev",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    { name: "setup", testMatch: /auth\.setup\.ts/ },
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"], storageState: "tests/e2e/.auth/user.json" },
      dependencies: ["setup"],
    },
  ],
});
