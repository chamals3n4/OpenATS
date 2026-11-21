# OpenATS backend

The OpenATS API and background worker. The API holds the business rules and all data access, and sends live updates over Socket.IO. The worker runs the slow jobs: reading CV text, deleting the files of removed candidates, and writing AI notes.

Both are built from this one package and share its code and database. This guide is for developers working on the backend. To set up the whole project, see [CONTRIBUTING.md](../CONTRIBUTING.md).

## Stack

- **Express 5** with TypeScript
- **PostgreSQL** through **Drizzle ORM**, with migrations in `drizzle/`
- **BullMQ** on **Redis** for background jobs
- **Socket.IO** for live updates, on the same HTTP server as the API
- **zod** for checking environment variables and request bodies
- **winston** for logs
- **Vitest** for unit and integration tests

## Running it

Install and set up everything from the **repository root** with `make setup`, then start it with `make dev`. That starts this API, the worker and the web app together.

To run the backend processes on their own, for example in separate terminals:

```bash
pnpm --filter ./backend dev          # the API on http://localhost:8080
pnpm --filter ./backend dev:worker   # the worker
```

The API needs the web app to be running too, because it gets the keys for checking sign-in tokens from `AUTH_JWKS_URL` on the web app.

| Address | What it is |
| --- | --- |
| http://localhost:8080/api | The signed-in API |
| http://localhost:8080/public | Public routes for the careers page and candidate links |
| http://localhost:8080/api-docs | Interactive API docs (Swagger), built from `openapi.yaml` |
| http://localhost:8080/health | Health check: database, Redis and whether a worker is connected |

## Commands

Run these from the root with `pnpm --filter ./backend <command>`, or from this folder with `pnpm <command>`.

| Command | What it does |
| --- | --- |
| `dev` | The API, restarting on changes |
| `dev:worker` | The worker, restarting on changes |
| `build` | Compile to `dist/` |
| `start` / `start:worker` | Run the compiled API or worker in production |
| `lint` | ESLint |
| `test` / `test:run` | Vitest in watch mode / once |
| `test:coverage` | Tests with a coverage report in `coverage/` |
| `exec drizzle-kit generate` | Create a migration from schema changes |
| `exec drizzle-kit migrate` | Apply migrations |
| `exec tsx src/db/seed.ts` | Add the default pipeline stages |

`make migrate` at the root runs `generate` and then `migrate`.

## Environment

`backend/.env` is checked with zod in `src/config/env.ts` when the API starts. It stops with a clear message if a required value is missing or wrong. `.env.example` explains every value. These are the ones you will touch most:

| Variable | What it is for |
| --- | --- |
| `DATABASE_URL`, `REDIS_URL` | Postgres and Redis. The defaults match the Docker services |
| `AUTH_JWKS_URL`, `AUTH_ISSUER` | Checking sign-in tokens. `AUTH_ISSUER` must equal `BETTER_AUTH_URL` in `frontend/.env` |
| `ENCRYPTION_KEY` | Encrypts stored integration credentials, such as Google tokens |
| `FRONTEND_URL` | Allowed for CORS, and used in links in emails |
| `R2_*` | File storage. Needed before you can upload a CV |
| `SMTP_*`, `MAIL_FROM` | Email. Locally this goes to Mailpit at http://localhost:8025 |
| `GEMINI_API_KEY` | Optional. AI notes, which also stay off until turned on in Settings |
| `GOOGLE_OAUTH_*` | Optional. Lets interviewers connect Google Calendar and Meet |
| `PORT` | Optional. Defaults to 8080 |
| `RUN_WORKER_IN_API` | Optional. Runs the worker inside the API process, for small single-process deployments |

Tests read `.env.test` instead, which points at the test database on port 5433.

## How the code is organised

```text
src/
├── server.ts          starts the HTTP server and Socket.IO
├── worker.ts          starts the background worker
├── app.ts             middleware, then mounts /public, /oauth and /api
├── routes/            index.ts mounts every module under /api; public.routes.ts holds /public
├── modules/           one folder per feature
├── shared/            code used by unrelated modules
│   ├── auth/          token checks and the job access rules
│   ├── services/      mail, storage, sockets, notifications
│   └── integrations/  outside providers, such as Google Meet
├── middlewares/       auth, roles, job access, rate limits, errors
├── queues/            one folder per background job
├── db/                Drizzle schema, seed and maintenance scripts
├── config/            environment, Redis, Swagger
└── utils/             logger, error helpers
```

### Modules

Each feature has a folder in `src/modules/`, such as `job/`, `candidate/` or `offer/`. A module holds three layers:

| File | Its job |
| --- | --- |
| `*.routes.ts` | The URLs, and the guards that run before the handler |
| `*.controller.ts` | Reads and checks the request, calls the service and sends the response |
| `*.service.ts` | The business rules and the database work. It knows nothing about Express |

A request travels like this:

```text
app.ts → authMiddleware → rate limit → routes/index.ts
       → module routes → guards → controller → service → PostgreSQL
```

The rules:

- Keep Express out of services, so they can be tested and reused by the worker.
- Check request bodies with a zod schema in the controller, using `safeParse`, before calling the service.
- Code that two or more unrelated modules need goes in `src/shared/`, not in one of the modules.

### Sign-in and permissions

The web app signs users in with Better Auth and sends a short-lived token with each call. `authMiddleware` checks the token against the keys at `AUTH_JWKS_URL`, using `src/shared/auth/verify-token.ts`. Socket.IO uses the same check.

The token only says who the user is. Their role and whether they are active are read from the `users` table on every request, so a change applies immediately. Users are never created from a token.

Being signed in isn't enough. Every route that returns job or candidate data must use a guard:

| Guard | From | Checks |
| --- | --- | --- |
| `requireManager`, `requireAdmin` | `middlewares/role.middleware.ts` | The user's role. This decides what they may **change** |
| `requireJobView`, `requireCandidateView`, `requireOfferView`, `requireInterviewView` | `middlewares/job-access.middleware.ts` | That the user is on the job's hiring team. This decides which jobs they may **see** |

Super admins see every job. The rules themselves live in `src/shared/auth/job-access.ts`. For a list endpoint, pass `teamScope(req.user)` to the service and filter the query by it, as the jobs and reports endpoints do, instead of checking each row.

When a user may not see a record, answer 403, not 404, so nobody can probe for ids.

### Public routes

Routes under `/public` have **no sign-in**, so nothing private may ever go there. The careers page routes are limited by origin: the web app's own address, plus the origins a company adds in its page settings. Candidates reach their assessments, assignments and offers through private token links.

### Database

- The schema is in `src/db/schema/`, with one file per area (`jobs.ts`, `candidates.ts`, `offers.ts` and so on) and the relations in `relations.ts`.
- The Better Auth tables are in `auth.ts`. CI checks that they still match what Better Auth expects.
- Use `db` from `src/db`, and Drizzle's query builder. Don't write raw SQL strings with user input in them.

**To change the schema:** edit the file in `src/db/schema/`, run `make migrate` at the root, and commit the schema change together with the new files in `drizzle/`. Never edit a migration that has already been merged.

### Background jobs

Each job has its own folder in `src/queues/`, with a `queue.ts` that adds jobs and a `worker.ts` that runs them.

| Queue | What it does |
| --- | --- |
| `cv-extract` | Reads the text of an uploaded CV, on its own thread with a 30-second limit, and saves it for search |
| `cv-analysis` | Sends the CV to Gemini for AI notes, if AI notes are turned on |
| `resume-delete` | Deletes the stored files of removed candidates |

To add a job, create a folder with the same two files and start its worker in `src/queues/start-workers.ts`. The API only adds jobs. It never waits for them.

### Files

CV files are kept in a **private** bucket, and the database stores only the file's key. The only way a CV leaves storage is through the API, which checks access first and then sends the file itself. Never return a public or signed bucket URL for a CV.

### Errors and logs

- Unhandled errors go to `middlewares/error.middleware.ts`.
- Use `safeErrorMessage(err, fallback)` from `utils/error.utils.ts` for a message in a response. A database error's message contains the query and its values, so it must never reach the client.
- Log with `logger` from `utils/logger.ts`, not `console.log`. Never log a token, a password or a secret.

## Adding an endpoint

1. Add the handler to the module's controller. Check the body with a zod schema.
2. Put the rules and database work in the module's service.
3. Add the route in the module's `*.routes.ts`, with the right role and job-access guards.
4. For a new module, mount its routes in `src/routes/index.ts`.
5. Document the endpoint in `openapi.yaml`, so it shows up in `/api-docs`.
6. Add tests: an integration test that calls the route, including a user who should be refused.

## Tests

Tests live in `tests/`:

| Folder | What goes there |
| --- | --- |
| `tests/unit/` | Plain functions, with no database |
| `tests/integration/` | Routes called through the app against the test database, with real tokens from `tests/helpers/jwt.ts` |
| `tests/helpers/` | Shared helpers: test tokens, a JWKS stub, sample PDFs |

Integration tests need the test database. See [Testing in CONTRIBUTING.md](../CONTRIBUTING.md#testing) to start and migrate it.

```bash
pnpm --filter ./backend test:run                                  # every test, once
pnpm --filter ./backend exec vitest run tests/unit/grading.test.ts  # one file
```

Test files run one at a time, because they share the test database.

## Troubleshooting

- **The API stops at start** with a config error: a value in `backend/.env` is missing or wrong. The message names it.
- **Every call returns 401:** the web app isn't running, or `AUTH_ISSUER` here doesn't exactly match `BETTER_AUTH_URL` in `frontend/.env`.
- **A CV stays "pending":** the worker isn't running. Check http://localhost:8080/health, which shows whether a worker is connected.
- **The careers page can't reach the API:** its origin isn't allowed. Check `FRONTEND_URL`, or add the site in the page settings.
- **Integration tests fail to connect:** the test database isn't running on port 5433, or it was restarted and needs migrating again.