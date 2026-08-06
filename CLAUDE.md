# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

OpenATS is a self-hosted applicant tracking system. It is a **pnpm workspace**: `backend/` and `frontend/` are separate packages sharing one root `package.json` and one root `pnpm-lock.yaml`. Run `pnpm install` once at the root, and use the root scripts (`pnpm dev`, `pnpm build`, `pnpm test`) or `pnpm --filter ./backend <script>` to target one package.

## Commands

### Backend (`backend/`)

```bash
pnpm dev              # nodemon + tsx, port 8080
pnpm build            # tsc → dist/
pnpm start            # node dist/src/server.js
pnpm test             # vitest (watch mode)
pnpm test:run         # vitest (single run)
pnpm vitest run tests/unit/object.util.test.ts                 # run one test file
pnpm drizzle-kit generate   # generate migration SQL (always commit output)
pnpm drizzle-kit migrate    # apply migrations to DB
pnpm tsx src/db/seed.ts     # seed pipeline stages (required on first setup)
docker compose up -d        # local Postgres (5432) + Redis (6379), see docker-compose.yml at the repo root
```

### Frontend (`frontend/`)

```bash
pnpm dev      # next dev --turbo, port 3000
pnpm build    # next build
pnpm lint     # eslint
```

## Architecture

### Backend

- **Express 5** (not 4) with TypeScript compiled to CommonJS (`"module": "commonjs"` in tsconfig). `tsx` handles dev transpilation.
- **Feature-first layout**: code is organized by feature under `backend/src/modules/<feature>/`, each holding that feature's `*.controller.ts`, `*.service.ts`, and `*.routes.ts` together (e.g. `modules/candidate/candidate.controller.ts`). There are no top-level `controllers/`, `services/`, or per-feature `routes/` directories — put new feature code in its module, not in a layer folder.
- **Request flow**: `backend/src/server.ts` → `backend/src/app.ts` → `backend/src/routes/index.ts` → each module's routes file → that module's controller → service.
- **Shared code**: `backend/src/shared/auth/verify-token.ts` is the single Asgardeo JWT verification path, used by both `auth.middleware.ts` and the Socket.IO handshake so the two transports cannot drift on who counts as authenticated; `backend/src/shared/services/` holds services used by 2+ modules (`mail`, `socket`, `r2`, `google-calendar`); `backend/src/shared/integrations/` holds external-provider infra (`connection.service`, `registry`, `crypto`, `google-meet.provider`) — distinct from the `modules/integrations/` feature, which is CRUD for a company's configured integrations. Cross-module imports (e.g. `offer` → `../template/template-engine.service`) are fine; only promote to `shared/` when 2+ unrelated modules need it.
- `backend/src/routes/` keeps only `index.ts` (mounts every module router) and `public.routes.ts` (cross-cutting `/public/*` aggregator that spans several modules). `modules/job/job.routes.ts` also mounts the `pipeline`, `hiring-team`, and `custom-question` modules as sub-routes under `/jobs`.
- Imports are plain relative paths (no `@/` alias — `module: commonjs` + `moduleResolution: node` would emit unresolvable `require("@/…")` into `dist/`). Depth stays at `../../` at most.
- **Auth middleware** (`backend/src/middlewares/auth.middleware.ts`): verifies WSO2 Asgardeo JWTs, maps roles (`super_admin`, `hiring_manager`, `interviewer`), and auto-provisions users on first login.
- **Public routes** (`/public/*`) use origin-based access control, not auth middleware. Assessment endpoints (`/public/assessment/:token`) use token-based auth.
- **`req.user`** is available via augmentation in `backend/src/types/express.d.ts`.
- **Socket.IO** runs on the same HTTP server. Connections require a valid Asgardeo JWT in `handshake.auth.token`, verified by an `io.use()` middleware before any handler runs; the verified user is on `socket.data.user`. Chat handlers take the sender from that user, never from the client payload. Dashboard-wide events are emitted to the `staff` room (which every authenticated socket joins), not with a bare `io.emit()`. CORS is restricted to `FRONTEND_URL`.
- Logger is winston with console transport only (file transports commented out).
- `exactOptionalPropertyTypes: false` in tsconfig — deliberate.
- **Redis + BullMQ**: CV analysis runs as a background job queue, colocated under `backend/src/queues/cv-analysis/` (`queue.ts`, `worker.ts`, `events.ts`); shared Redis connection factory is `backend/src/config/redis.ts`. Connection is read from `REDIS_URL` (defaults to `redis://localhost:6379`). A dedicated connection is created per Queue/Worker (BullMQ best practice), not a shared singleton.

### Database

- PostgreSQL via **Drizzle ORM**. Schema files live in `backend/src/db/schema/` (one file per domain + `relations.ts`).
- DB connection: `backend/src/db/index.ts` — pg Pool with Neon scale-to-zero handling (production uses Neon; local dev can point `DATABASE_URL` at any Postgres, including the local Docker container).
- When changing the schema: run `pnpm drizzle-kit generate` in `backend/`, then **commit the generated `drizzle/*.sql` files**.
- The seed (`backend/src/db/seed.ts`) creates 5 default pipeline stages (Applied, Screening, Interviewed, Offer, Rejected) - required for the app to function.
- **Local Postgres + Redis**: `docker-compose.yml` at the repo root runs both as containers (`openats`/`openats`/`openats` for user/password/db on Postgres; Redis with no auth). Not required — Neon/hosted Redis work too — but this is the fastest path for local dev. See `CONTRIBUTING.md` for the full setup flow.

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

See `docs/TESTING.md` for the full guide. In short:

- **Unit + integration tests** use Vitest and live in `backend/tests/` (`unit/`, `integration/`), excluded from `tsconfig.json` compilation. Config is `backend/vitest.config.mts` (`.mts` because the backend is a CommonJS package).
- **End-to-end tests** use Playwright and live in `e2e/` at the repo root, because they span both packages. Config is `playwright.config.ts`, and `tsconfig.json` at the root covers them.
- **Integration tests hit a real database**: a separate Postgres on port **5433** (`postgres-test` in `docker-compose.yml`), never the dev database on 5432. `backend/tests/setup.ts` loads `backend/.env.test` with `override: true` to enforce this.
- `backend/.env.test` is committed on purpose. It holds no secrets, only dummy values, so that tests pass on pull requests from forks (GitHub never gives secrets to those).
- E2E tests also use the 5433 database, via `webServer.env` in `playwright.config.ts`. `reuseExistingServer` is `false` so an already-running `make dev` cannot be adopted, which would silently point tests at the dev database. **Stop `make dev` before running E2E.**
- Commands: `pnpm test` (unit + integration), `pnpm test:e2e` (Playwright), `pnpm exec tsc --noEmit` (type-check the E2E specs, which Playwright does not do).
- CI runs tests, type-check, and the backend build on every pull request (`.github/workflows/test.yml`). It deliberately uses no secrets.
- No frontend tests exist.

## Roadmap

`docs/GA_ROADMAP.md` tracks everything remaining before v1.0, grouped by release, with a status on every item (🔴 Planned, 🟡 In progress, 🟢 Done).

**When you complete work that appears on that roadmap, update the item's status in the same change.** If you finish something that is not listed, add a row for it. An out-of-date roadmap is worse than none, because it states things that are not true.

## Environment Variables

Two separate `.env` files are required (copy from `.env.example` in each directory):

- `backend/.env` — `DATABASE_URL`, `REDIS_URL`, `R2_*`, `RESEND_*`, `ASGARDEO_*`, `GEMINI_API_KEY`, `GOOGLE_SERVICE_ACCOUNT_JSON`, `GOOGLE_CALENDAR_ID`
- `frontend/.env` — `NEXT_PUBLIC_ASGARDEO_*`, `ASGARDEO_*`, `OPENATS_API_URL`, `NEXT_PUBLIC_API_URL`

## CI/CD

- `.github/workflows/deploy.yml` deploys the **backend only** to an Azure VM on push to `main` (when `backend/**` changes): SSH → git pull → pnpm install → build → pm2 restart.
- No CI for the frontend; no automated linting or tests in CI.
- Only `frontend/` has ESLint. The backend has no lint config.
