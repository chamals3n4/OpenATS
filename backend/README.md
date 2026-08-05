## OpenATS Backend

OpenATS backend was written using Express.js.

## How It Works

- **Folder layout**: code is grouped by feature under `src/modules/<feature>/`, each holding that feature's `*.controller.ts`, `*.service.ts`, and `*.routes.ts` together (for example `src/modules/candidate/`). There are no top-level `controllers/` or `services/` folders. Code shared by two or more modules lives in `src/shared/services/` (mail, socket, r2, google-calendar) and `src/shared/integrations/` (external provider infra).
- **Request flow**: `src/server.ts` starts the HTTP server, `src/app.ts` wires up middleware and routes, `src/routes/index.ts` mounts each module's routes file, which delegates to that module's controller and then its service.
- **Authentication**: WSO2 Asgardeo JWTs are verified in `src/middlewares/auth.middleware.ts`, which maps roles (`super_admin`, `hiring_manager`, `interviewer`) and auto-provisions new users on first login.
- **Public routes**: Career page and application endpoints under `/public/*` use origin-based access control instead of auth middleware. Assessment links use token-based auth.
- **Database**: PostgreSQL via Drizzle ORM. Schema files live in `src/db/schema/`, one per domain.
- **Background jobs**: CV analysis runs as a background job queue (BullMQ + Redis), colocated under `src/queues/cv-analysis/`. This runs in a separate worker process from the API server.
- **Real-time updates**: Socket.IO runs on the same HTTP server as the API.

## Running the Backend

### Prerequisites

- Node.js 22+
- pnpm
- A running PostgreSQL database and Redis instance (see `CONTRIBUTING.md` for local Docker setup)
- `.env` file configured (copy from `.env.example`)

### Install dependencies

OpenATS is a pnpm workspace, so install once from the **repo root**, not from `backend/`:

```bash
cd ..
pnpm install
```

### Start Postgres and Redis with Docker

A `docker-compose.yml` is provided at the **repo root** so you don't need to install or configure either manually. Run these from the root:

```bash
docker compose up -d
```

This starts:

- **Postgres** on `localhost:5432` (user: `openats`, password: `openats`, db: `openats`)
- **Redis** on `localhost:6379`

Check they're running:

```bash
docker compose ps
```

Stop them when you're done for the day (data is preserved):

```bash
docker compose stop
```

### Environment variables

Copy the example env file and fill in the values:

```bash
cp .env.example .env
```

If you're using the Docker containers above, `DATABASE_URL` and `REDIS_URL` are:

```bash
DATABASE_URL=postgresql://openats:openats@localhost:5432/openats
REDIS_URL=redis://localhost:6379
```

The remaining variables are for external/cloud services and are only needed if you're working on the feature that depends on them:

- `ASGARDEO_*` - WSO2 Asgardeo auth. Required for almost everything - most routes are gated behind the auth middleware.
- `R2_*` - Cloudflare R2 object storage, used for file uploads (e.g. resumes).
- `RESEND_*` - Resend API, used for sending emails (e.g. application confirmations).
- `GEMINI_API_KEY` - Used by the CV analysis service.
- `GOOGLE_SERVICE_ACCOUNT_JSON` and `GOOGLE_CALENDAR_ID` - used for Google Calendar integration (interview scheduling). The backend authenticates as a service account, so these are the only Google-related variables needed.

### First-time setup

Run database migrations and seed the default pipeline stages (required for the app to function):

```bash
pnpm drizzle-kit migrate
pnpm tsx src/db/seed.ts
```

### Start the API server

```bash
pnpm dev
```

Runs on `http://localhost:8080` by default.

### Start the background worker

CV analysis jobs are processed by a separate worker process, not the API server. Run this alongside `pnpm dev` in another terminal:

```bash
pnpm dev:worker
```

### Run tests

Unit and integration tests use Vitest and live in `tests/`. Integration tests need the separate test database on port 5433, which is the `postgres-test` service in the root `docker-compose.yml`. See `docs/TESTING.md` for the full guide and first-time setup.

```bash
pnpm test:run                                    # single run
pnpm vitest run tests/unit/object.util.test.ts   # a single file
```

End-to-end tests (Playwright) live in `e2e/` at the repo root and are run from there with `pnpm test:e2e`.

### Build for production

```bash
pnpm build
pnpm start          # runs the API server
pnpm start:worker    # runs the background worker
```

## Schema Changes

Whenever you modify a Drizzle schema file under `src/db/schema/`, generate and commit the migration:

```bash
pnpm drizzle-kit generate
```

See the root `CONTRIBUTING.md` for the full contribution workflow (branching, PRs, etc).
