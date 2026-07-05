## OpenATS Backend

OpenATS backend was written using Express.js.

## How It Works

- **Request flow**: `src/server.ts` starts the HTTP server, `src/app.ts` wires up middleware and routes, `src/routes/index.ts` mounts per-resource route files (candidates, jobs, interviews, offers, etc.), which delegate to controllers and then services.
- **Authentication**: WSO2 Asgardeo JWTs are verified in `src/middlewares/auth.middleware.ts`, which maps roles (`super_admin`, `hiring_manager`, `interviewer`) and auto-provisions new users on first login.
- **Public routes**: Career page and application endpoints under `/public/*` use origin-based access control instead of auth middleware. Assessment links use token-based auth.
- **Database**: PostgreSQL via Drizzle ORM. Schema files live in `src/db/schema/`, one per domain.
- **Background jobs**: CV analysis runs as a background job queue (BullMQ + Redis), colocated under `src/queues/cv-analysis/`. This runs in a separate worker process from the API server.
- **Real-time updates**: Socket.IO runs on the same HTTP server as the API.

## Running the Backend

### Prerequisites

- Node.js 20+
- pnpm
- A running PostgreSQL database and Redis instance (see `CONTRIBUTING.md` for local Docker setup)
- `.env` file configured (copy from `.env.example`)

### Install dependencies

```bash
pnpm install
```

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

```bash
pnpm test:run          # single run
pnpm vitest run tests/candidates/candidate.service.test.ts   # a single file
```

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

See the root `CONTRIBUTING.md` for the full local setup flow, including Docker instructions for Postgres and Redis.
