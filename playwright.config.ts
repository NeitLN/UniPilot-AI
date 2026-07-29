import { defineConfig, devices } from "@playwright/test";
import { config } from "dotenv";

config({ path: ".env.local" });

/**
 * E2E coverage for the six core user activities (UA-1..UA-6, see
 * docs/ROADMAP.md / the SRS). Requires a real signed-up Supabase user —
 * point E2E_EMAIL / E2E_PASSWORD at one via .env.local or the shell.
 * auth.setup.ts logs in once and every other spec reuses that session.
 */
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  // Against the dev server (not a production build), an occasional retry
  // absorbs normal timing flake without masking real failures — a genuinely
  // broken flow still fails twice.
  retries: 1,
  workers: 1,
  reporter: "list",
  timeout: 30_000,
  use: {
    baseURL: "http://localhost:3000",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "setup", testMatch: /auth\.setup\.ts/ },
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"], storageState: "tests/e2e/.auth/user.json" },
      dependencies: ["setup"],
    },
  ],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000/login",
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
