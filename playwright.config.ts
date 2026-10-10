import { defineConfig } from "@playwright/test";

const TEST_DATABASE_URL =
  "postgresql://openats:openats@localhost:5433/openats_test";

const FRONTEND_URL = "http://localhost:3000";

export default defineConfig({
  testDir: "./e2e",
  use: { baseURL: FRONTEND_URL },
  webServer: {
    command: "pnpm dev",
    url: FRONTEND_URL,
    // Playwright must own the servers so DATABASE_URL below actually applies.
    // With reuse enabled, an already-running `make dev` would be adopted
    // instead — silently pointing the whole suite at the dev database.
    reuseExistingServer: false,
    // dotenv does not override existing process.env, so this wins over
    // backend/.env and keeps E2E writes out of the dev database.
    // DATABASE_URL reaches both servers: Express for the data and Next.js for
    // Better Auth, so sign-in state stays out of the dev database too.
    env: {
      DATABASE_URL: TEST_DATABASE_URL,
      // Test-only value. Sessions signed with it are worthless anywhere else.
      BETTER_AUTH_SECRET: "e2e-only-secret-not-used-anywhere-else-0000",
      BETTER_AUTH_URL: FRONTEND_URL,
      AUTH_JWKS_URL: `${FRONTEND_URL}/api/auth/jwks`,
      AUTH_ISSUER: FRONTEND_URL,
    },
    timeout: 120_000,
  },
});
