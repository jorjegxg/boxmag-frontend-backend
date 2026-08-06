import { defineConfig, devices } from "@playwright/test";

/**
 * Demo video recorder — not the main e2e suite (Cypress).
 * Requires frontend on http://localhost:3006.
 */
export default defineConfig({
  testDir: "./demo",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 10 * 60 * 1000,
  expect: { timeout: 15_000 },
  outputDir: "demo-videos/run",
  reporter: [["list"]],
  use: {
    baseURL: process.env.DEMO_BASE_URL ?? "http://localhost:3006",
    locale: "ro-RO",
    viewport: { width: 1280, height: 800 },
    video: {
      mode: "on",
      size: { width: 1280, height: 800 },
    },
    screenshot: "off",
    trace: "off",
    actionTimeout: 20_000,
    navigationTimeout: 30_000,
  },
  projects: [
    {
      name: "demo",
      use: {
        ...devices["Desktop Chrome"],
        channel: undefined,
        launchOptions: {
          slowMo: 450,
        },
      },
    },
  ],
});
