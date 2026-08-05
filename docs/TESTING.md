# OpenATS Testing Guide

OpenATS uses three layers of automated tests: unit tests for pure logic, integration tests for the API and database, and end-to-end tests that drive a real browser through the running app. This guide explains what each layer does, which tools and databases they use, and how to run and write them.

## 1. Testing stack

Only two test tools are used across the whole project.

| Tool | Version | Used for |
| --- | --- | --- |
| [Vitest](https://vitest.dev) | 4.x | Unit and integration tests (backend) |
| [Supertest](https://github.com/ladjs/supertest) | 7.x | Sending HTTP requests to the Express app inside integration tests |
| [Playwright](https://playwright.dev) | 1.x | End-to-end tests in a real browser |

Vitest is used instead of Jest because it has native TypeScript and ESM support, which matters since the project is TypeScript throughout. Playwright is used instead of Selenium or Cypress because it can start the app itself, drives a real browser, and ships with a built-in debugging UI.

There is deliberately no separate assertion library, no Selenium, and no Cypress. Vitest and Playwright cover every layer.

## 2. The three types of tests

### Unit tests

A unit test checks one function on its own. No database, no network, no browser. You give it an input and check the output.

```ts
// backend/tests/unit/object.util.test.ts
expect(cleanObject({ a: 1, b: undefined })).toEqual({ a: 1 });
```

These run in milliseconds and tell you exactly which function is broken. Use them for pure logic such as formatting, validation rules, parsing, and calculations.

### Integration tests

An integration test checks several real parts working together: a route, its controller, its service, and a **real Postgres database**. Supertest sends a genuine HTTP request into the Express app.

```ts
// backend/tests/integration/health.test.ts
const res = await request(app).get("/health");
expect(res.status).toBe(200);
expect(res.body.checks).toMatchObject({ db: "ok", redis: "ok" });
```

These catch what unit tests cannot: real SQL errors, wrong column names, broken migrations, and middleware in the wrong order. Use them for anything that touches the database.

Note that no server is started on port 8080. Supertest imports the Express app directly and binds it to a random free port for the duration of each request, so integration tests never conflict with a running dev server.

### End-to-end (E2E) tests

An E2E test opens a real browser and uses the app the way a person would. The whole stack runs: Next.js frontend, Express backend, and Postgres.

```ts
// e2e/careers.spec.ts
await page.goto("/careers");
await expect(page.getByRole("heading", { name: "Open roles" })).toBeVisible();
```

These are the slowest tests (seconds, not milliseconds) and they tell you the least about *where* a problem is, but they are the only tests that prove the app actually works for a real user. Keep them few and reserve them for critical paths.

### How many of each

Write many unit tests, some integration tests, and few E2E tests. Unit tests are fast and precise, so lean on them. E2E tests are slow and can be flaky, so keep them to the flows that would genuinely hurt if they broke.

## 3. Where tests live

```
OpenATS/
├── e2e/                          Playwright specs (repo root)
│   └── careers.spec.ts
├── playwright.config.ts          Playwright config (repo root)
├── tsconfig.json                 TypeScript config covering e2e/ only
└── backend/
    ├── vitest.config.mts         Vitest config
    ├── .env.test                 Test database connection
    └── tests/
        ├── setup.ts              Loads .env.test before tests run
        ├── unit/
        └── integration/
```

Playwright lives at the repo root because an E2E test spans both `backend/` and `frontend/`, so it belongs to neither package. Vitest lives inside `backend/` because its tests import backend source files directly.

The Vitest config file is `vitest.config.mts` and not `.ts`. The backend is a CommonJS package (no `"type": "module"` in its `package.json`), so the `.mts` extension is required for the config to load as an ES module.

## 4. Databases used by tests

This is the part worth understanding properly, because getting it wrong means tests write into your development data.

There are two Postgres containers, both defined in the root `docker-compose.yml`:

| Container | Port | Database | Storage | Used by |
| --- | --- | --- | --- | --- |
| `openats-postgres` | 5432 | `openats` | Persistent volume | Normal development |
| `openats-postgres-test` | 5433 | `openats_test` | `tmpfs` (in memory) | Integration tests and E2E tests |

The test database uses `tmpfs`, so its data lives in memory and is wiped whenever the container restarts. That is intentional. Test data should never survive a restart.

**Integration tests** get the test database through `backend/tests/setup.ts`, which loads `backend/.env.test` with `override: true`. The `override` flag is essential. Without it the regular `backend/.env` would win and tests would run against your development database.

**E2E tests** get the test database through `playwright.config.ts`, which passes `DATABASE_URL` to the servers it starts:

```ts
webServer: {
  command: "pnpm dev",
  reuseExistingServer: false,
  env: { DATABASE_URL: "postgresql://openats:openats@localhost:5433/openats_test" },
}
```

This works because `backend/src/server.ts` uses `import "dotenv/config"`, and dotenv does not override environment variables that are already set.

> ⚠️ `reuseExistingServer` is set to `false` on purpose. If it were enabled and you already had `make dev` running, Playwright would attach to that server instead of starting its own, and that server reads `backend/.env`. The `DATABASE_URL` above would be silently ignored and the whole suite would quietly run against your development database. Stop `make dev` before running E2E tests.

### Redis

Redis is currently shared between development, integration tests, and E2E tests on port 6379. This is fine today because no test exercises the BullMQ CV analysis queue. Once tests do cover the queue, use a separate database index (`redis://localhost:6379/1`) or add a dedicated `redis-test` container, otherwise a job enqueued by a test could be picked up by your development worker.

## 5. First time setup

Install dependencies from the repo root:

```bash
pnpm install
pnpm exec playwright install chromium
```

Start the test database and apply the schema to it:

```bash
docker compose up -d postgres-test
cd backend
DATABASE_URL=postgresql://openats:openats@localhost:5433/openats_test pnpm drizzle-kit migrate
```

> ⚠️ Note the port is **5433**, not 5432. Using 5432 here points the migration at your development database instead.

Confirm the schema was applied:

```bash
docker exec openats-postgres-test psql -U openats -d openats_test -c '\dt'
```

## 6. Running the tests

### Unit and integration tests

```bash
pnpm test          # run once
pnpm test:watch    # re-run on file changes
make test          # same as pnpm test
```

These can run at the same time as `make dev`. They never bind to port 8080.

### End-to-end tests

Stop `make dev` first, then:

```bash
make infra-up      # start Postgres and Redis
pnpm test:e2e
make test-e2e      # same as pnpm test:e2e
```

Playwright starts the backend on port 8080 and the frontend on port 3000 itself, runs the specs, then shuts them down. If either port is already in use you will get an `EADDRINUSE` error, which means `make dev` is still running.

### Type checking the E2E tests

Playwright transpiles TypeScript without type checking, so a type error in an E2E spec will not fail the test run. Check them separately:

```bash
pnpm exec tsc --noEmit
```

## 7. Writing a new test

Decide which layer the test belongs to:

- Testing a single function with no database? Put it in `backend/tests/unit/`.
- Testing a route, a service, or a Drizzle query? Put it in `backend/tests/integration/`.
- Testing something a user sees or clicks in the browser? Put it in `e2e/`.

Vitest picks up any file matching `tests/**/*.test.ts`. Playwright picks up any file in `e2e/`.

Integration tests share one database, so `fileParallelism` is disabled in `vitest.config.mts` to stop test files racing each other.

## 8. Debugging a failing test

For Vitest, run a single file:

```bash
cd backend
pnpm vitest run tests/integration/health.test.ts
```

For Playwright, the interactive UI is the best tool. It shows a snapshot of the page at every step:

```bash
pnpm exec playwright test --ui         # interactive runner
pnpm exec playwright test --headed     # watch the real browser
pnpm exec playwright show-report       # HTML report after a failure
pnpm exec playwright test -g "careers" # run tests matching a name
```

## 9. Make sure your test can actually fail

A test you have never seen fail is a test you do not know works. After writing one, break the thing it is guarding and confirm it turns red.

For example, to confirm the E2E test that checks the backend API really does catch an unreachable backend:

```bash
OPENATS_API_URL=http://localhost:9999 pnpm test:e2e
```

That test should fail while the others still pass. This takes thirty seconds and it is the difference between real coverage and a test that only looks reassuring.

A concrete example from this project: the careers page catches its own fetch errors and falls back to an empty job list, so a completely dead backend renders exactly like "no jobs posted". A test that only checked the page loaded would pass through a total backend outage. That is why `e2e/careers.spec.ts` also asserts against `/public/jobs` directly.

## 10. Things to be aware of

- The E2E suite runs against an empty test database. Once you write tests that need job listings, candidates, or pipeline stages, seed the test database first (`pnpm tsx src/db/seed.ts` with `DATABASE_URL` pointed at port 5433) or insert fixtures in a Playwright `beforeAll`.
- There are no frontend unit tests yet. If you add them, install Vitest inside `frontend/` rather than at the root.
- Authenticated E2E tests are not set up. Logging in through WSO2 Asgardeo in a test means driving a hosted identity provider, which needs real credentials and is slow and flaky. Prefer testing `/public/*` routes, which skip authentication entirely, or save a Playwright `storageState` from one manual login and reuse it.
