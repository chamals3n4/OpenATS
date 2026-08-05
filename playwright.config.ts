import { defineConfig } from "@playwright/test";

const TEST_DATABASE_URL =
  "postgresql://openats:openats@localhost:5433/openats_test";

export default defineConfig({
  testDir: "./e2e",
  use: { baseURL: "http://localhost:3000" },
  webServer: {
    command: "pnpm dev",
    url: "http://localhost:3000",
    // Playwright must own the servers so DATABASE_URL below actually applies.
    // With reuse enabled, an already-running `make dev` would be adopted
    // instead — silently pointing the whole suite at the dev database.
    reuseExistingServer: false,
    // dotenv does not override existing process.env, so this wins over
    // backend/.env and keeps E2E writes out of the dev database.
    env: { DATABASE_URL: TEST_DATABASE_URL },
    timeout: 120_000,
  },
});
