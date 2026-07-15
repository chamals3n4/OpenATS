# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

OpenATS is a self-hosted applicant tracking system. It is **not a monorepo** — `backend/` and `frontend/` are independent packages with separate `package.json` and `pnpm-lock.yaml` files. Install and run them independently.

## Commands

### Backend (`backend/`)

```bash
pnpm dev              # nodemon + tsx, port 8080
pnpm build            # tsc → dist/
pnpm start            # node dist/src/server.js
pnpm test             # vitest (watch mode)
pnpm test:run         # vitest (single run)
pnpm vitest run tests/health.test.ts                           # run one test file
pnpm vitest run tests/candidates/candidate.service.test.ts
pnpm drizzle-kit generate   # generate migration SQL (always commit output)
pnpm drizzle-kit migrate    # apply migrations to DB
pnpm tsx src/db/seed.ts     # seed pipeline stages (required on first setup)
docker compose up -d        # local Postgres (5432) + Redis (6379), see backend/docker-compose.yml
```

### Frontend (`frontend/`)

```bash
pnpm dev      # next dev --turbo, port 3000
pnpm build    # next build
pnpm lint     # eslint
```

### Whole stack (repo root)

```bash
cp .env.example .env                          # root .env is for Docker only
docker compose up -d --build                  # postgres, redis, migrate, backend, worker, frontend
docker compose --profile seed run --rm seed   # opt-in; seed.ts wipes pipeline_stage_templates
docker compose logs -f backend worker
```

`docker-compose.yml` (root) runs everything; `backend/docker-compose.yml` runs only Postgres + Redis for the `pnpm dev` flow. Don't run both — they collide on 5432/6379. See `docs/DOCKER.md`.

## Architecture

### Backend

- **Express 5** (not 4) with TypeScript compiled to CommonJS (`"module": "commonjs"` in tsconfig). `tsx` handles dev transpilation.
- **Request flow**: `backend/src/server.ts` → `backend/src/app.ts` → `backend/src/routes/index.ts` → per-resource route files → controllers → services.
- **Auth middleware** (`backend/src/middlewares/auth.middleware.ts`): verifies WSO2 Asgardeo JWTs, maps roles (`super_admin`, `hiring_manager`, `interviewer`), and auto-provisions users on first login.
- **Public routes** (`/public/*`) use origin-based access control, not auth middleware. Assessment endpoints (`/public/assessment/:token`) use token-based auth.
- **`req.user`** is available via augmentation in `backend/src/types/express.d.ts`.
- Socket.IO runs on the same HTTP server with CORS set to `*`.
- Logger is winston with console transport only (file transports commented out).
- `exactOptionalPropertyTypes: false` in tsconfig — deliberate.
- **Redis + BullMQ**: CV analysis runs as a background job queue, colocated under `backend/src/queues/cv-analysis/` (`queue.ts`, `worker.ts`, `events.ts`); shared Redis connection factory is `backend/src/config/redis.ts`. Connection is read from `REDIS_URL` (defaults to `redis://localhost:6379`). A dedicated connection is created per Queue/Worker (BullMQ best practice), not a shared singleton.

### Database

- PostgreSQL via **Drizzle ORM**. Schema files live in `backend/src/db/schema/` (one file per domain + `relations.ts`).
- DB connection: `backend/src/db/index.ts` — pg Pool with Neon scale-to-zero handling (production uses Neon; local dev can point `DATABASE_URL` at any Postgres, including the local Docker container).
- When changing the schema: run `pnpm drizzle-kit generate` in `backend/`, then **commit the generated `drizzle/*.sql` files**.
- The seed (`backend/src/db/seed.ts`) creates 5 default pipeline stages (Applied, Screening, Interviewed, Offer, Rejected) - required for the app to function.
- **Local Postgres + Redis**: `backend/docker-compose.yml` runs both as containers (`openats`/`openats`/`openats` for user/password/db on Postgres; Redis with no auth). Not required — Neon/hosted Redis work too — but this is the fastest path for local dev. See `CONTRIBUTING.md` for the full setup flow.

### Frontend

- **Next.js** with `force-dynamic` on the root layout (`frontend/app/layout.tsx`) — the entire app is SSR-disabled because `AsgardeoProvider` requires request context.
- Heavy components are code-split with `ssr: false` via `frontend/components/dynamic-imports.tsx`.
- **Tailwind v4** — CSS-first config (`@tailwindcss/postcss`), no `tailwind.config.ts`. Theme defined via `@theme` in CSS globals.
- **shadcn/ui** with `base-vega` style. Icon library is **hugeicons** (not lucide or heroicons).
- Path alias: `@/*` → `./*` (configured in both `tsconfig.json` and Next.js config).
- **Server-side data fetching**: `serverFetch` in `frontend/lib/auth-action.ts` using `React.cache()` for auth context.
- **Client-side data fetching**: `useApi` hook + React Query hooks in `frontend/hooks/queries/`.
- **Component placement convention**: components/hooks/utils scoped to one route live colocated under that route using Next.js's underscore-prefixed folders (excluded from routing) — `_components/` (nest further for large features, e.g. `templates/_components/template-form/email-builder/`), `lib/` (singular — not `libs/`), `hooks/`. Only truly shared code goes in the top-level `frontend/components/` (shadcn primitives in `components/ui`, shared `components/table`), `frontend/lib/`, and `frontend/hooks/queries/`.

## Testing

- All tests live in `backend/tests/` and are excluded from `tsconfig.json` compilation.
- Service tests (`*.service.test.ts`) define their own Zod schemas — they do NOT import real service code or DB schemas. Pure unit/schema validation, no DB.
- Security tests (`*.security.test.ts`) test SQL injection and XSS resistance via Zod validation.
- The only integration test is `tests/health.test.ts` (uses supertest against the Express app).
- No frontend tests exist.

## Environment Variables

For the `pnpm dev` flow, two separate `.env` files are required (copy from `.env.example` in each directory):

- `backend/.env` — `DATABASE_URL`, `REDIS_URL`, `R2_*`, `RESEND_*`, `ASGARDEO_*`, `GEMINI_API_KEY`, `GOOGLE_SERVICE_ACCOUNT_JSON`, `GOOGLE_CALENDAR_ID`
- `frontend/.env` — `NEXT_PUBLIC_ASGARDEO_*`, `ASGARDEO_*`, `OPENATS_API_URL`, `NEXT_PUBLIC_API_URL`

The Docker flow ignores both and reads the root `.env` (from `/.env.example`) instead.

`RESEND_API_KEY`, `GEMINI_API_KEY` and `ASGARDEO_JWKS_URL` are read at module scope (`mail.service.ts`, `cv-analysis.service.ts`, `auth.middleware.ts`), so an empty value crashes the backend at startup rather than degrading the feature. The root `.env.example` ships placeholders for exactly this reason.

## CI/CD

- `.github/workflows/deploy.yml` deploys the **backend only** to an Azure VM on push to `main` (when `backend/**` changes): SSH → git pull → pnpm install → build → pm2 restart.
- No CI for the frontend; no automated linting or tests in CI.
- Only `frontend/` has ESLint. The backend has no lint config.
