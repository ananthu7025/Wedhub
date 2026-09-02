import { defineConfig, devices } from "@playwright/test";

/**
 * Per-phase verification runs — see frontenddocs/01-reference-cross-cutting.md
 * "Verification standard". Always headed: the point is for a human to watch
 * the browser exercise what was just built, against the real running
 * backend, never headless/CI-style. Run with `npm run test:e2e:watch`.
 */
export default defineConfig({
  testDir: "./e2e",
  // Generous timeout — slowMo below intentionally slows every action so a
  // human can watch, and multi-step flows (signup wizard + role-gating
  // checks + re-login) can otherwise brush against a tighter default.
  timeout: 60_000,
  fullyParallel: false,
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL: "http://localhost:3000",
    headless: false,
    launchOptions: {
      slowMo: 400,
    },
    trace: "retain-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
