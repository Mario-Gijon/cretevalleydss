import { defineConfig, devices } from "@playwright/test";
import { env } from "node:process";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  timeout: 30_000,
  expect: {
    timeout: 5_000,
  },
  forbidOnly: Boolean(env.CI),
  retries: 0,
  reporter: "list",
  use: {
    baseURL: env.E2E_BASE_URL || "http://127.0.0.1:5174",
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
    video: "off",
    viewport: { width: 1280, height: 900 },
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
