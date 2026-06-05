# AGENTS.md

## Project layout — not a monorepo

Three separate packages with independent `package.json` and `pnpm-lock.yaml`. No `pnpm-workspace.yaml`. Install and run separately:

```bash
cd backend && pnpm install   # Express backend (port 8080)
cd frontend && pnpm install    # Next.js frontend (port 3000)
```

## Commands

### API (`api/`)

```bash
pnpm dev              # nodemon + tsx, port 8080
pnpm build            # tsc → dist/
pnpm start            # node dist/src/server.js
pnpm test             # vitest (watch)
pnpm test:run         # vitest run (single run)
pnpm vitest run tests/health.test.ts           # run one file
pnpm vitest run tests/candidates/candidate.service.test.ts
pnpm drizzle-kit generate   # generate migration SQL (commit output!)
pnpm drizzle-kit migrate     # apply migrations
pnpm tsx src/db/seed.ts      # seed pipeline stages (required first time)
```

### Webapp (`frontend/`)

```bash
pnpm dev      # next dev --turbo
pnpm build    # next build
pnpm lint     # eslint
```

## Database & migrations

- PostgreSQL via Drizzle ORM. Schema: `backend/src/db/schema/` (modular — 10 files + relations.ts).
- DB connection: `backend/src/db/index.ts` — pg Pool with Neon scale-to-zero handling.
- **When changing the schema**: run `pnpm drizzle-kit generate` in `backend/`, then **commit the generated `drizzle/*.sql` files**.
- Seed creates 5 default pipeline stages (Applied, Screening, Interviewed, Offer, Rejected). Required for the app to work.

## API architecture

- **Express 5** (not 4). Routes: `backend/src/routes/index.ts`.
- **CommonJS** output (`tsconfig.json` `"module": "commonjs"`) despite TypeScript source. tsx handles dev transpilation transparently.
- **Auth**: JWT via WSO2 Asgardeo. Middleware: `backend/src/middlewares/auth.middleware.ts` — verifies token, maps roles (`super_admin`, `hiring_manager`, `interviewer`), **auto-provisions users on first login**.
- **Request type augmentation**: `backend/src/types/express.d.ts` adds `req.user` to Express Request.
- **`exactOptionalPropertyTypes: false`** in tsconfig — deliberate deviation from strict defaults.
- Public routes (`/public/*`) use origin-based access control, not auth middleware.
- Assessment endpoints (`/public/assessment/:token`) use token-based auth.
- Socket.IO runs on the same HTTP server, CORS set to `*`.
- Logger (winston): console transport only. File transports are commented out.

## Testing conventions

- **Tests live in `backend/tests/`** and are **excluded from `tsconfig.json`** compilation (line 29). Run via vitest/tsx directly.
- **Tests define their own Zod schemas** — they do NOT import the actual service code or DB schemas. Each `*.service.test.ts` re-declares Zod validation rules to test business logic in isolation.
- **No DB in tests** — pure unit/schema validation.
- The only integration test is `tests/health.test.ts` (uses supertest against Express app).
- Security tests (`*.security.test.ts`) test for SQL injection and XSS via Zod validation.
- **No frontend tests** exist.

## Frontend quirks

- **force-dynamic** on root layout (`frontend/app/layout.tsx`) — entire app is SSR-disabled because AsgardeoProvider needs request context.
- Heavy components are code-split with `ssr: false` in `frontend/components/dynamic-imports.tsx`.
- Tailwind **v4** — CSS-first config (`@tailwindcss/postcss`), no `tailwind.config.ts`. Classes defined via `@theme` in CSS.
- shadcn/ui **base-vega** style with **hugeicons** as the icon library — not default shadcn.
- Path alias: `@/*` → `./*` (both `tsconfig.json` and Next.js).
- Server-side data fetching: `serverFetch` in `frontend/lib/auth-action.ts` (cached auth context via `React.cache()`).
- Client-side data fetching: `useApi` hook + React Query hooks in `frontend/hooks/queries/`.

## Environment variables

Two separate `.env` files needed (copy from `.env.example` in each):

- `backend/.env` — DATABASE*URL, R2*\_, RESEND\_\_, ASGARDEO\_\*, GEMINI_API_KEY
- `frontend/.env` — NEXT*PUBLIC_ASGARDEO*\_, ASGARDEO\_\_, OPENATS_API_URL, NEXT_PUBLIC_API_URL

## Linting & formatting

- **Only `frontend/` has ESLint** (`eslint.config.mjs` — next/core-web-vitals + next/typescript). The API has no lint config.
- **No Prettier, no pre-commit hooks**, no formatting enforcement.

## CI/CD

- Single workflow: `.github/workflows/deploy.yml` — deploys **API only** to Azure VM on push to `main` (when `backend/**` changes). SSH + git pull + pnpm install + build + pm2 restart.
- **No CI for web frontend**, no test running, no linting in CI.
