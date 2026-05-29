# AGENTS.md

## Project layout — not a monorepo

Three separate packages with independent `package.json` and `pnpm-lock.yaml`. No `pnpm-workspace.yaml`. Install and run separately:

```bash
cd api && pnpm install   # Express backend (port 8080)
cd web && pnpm install    # Next.js frontend (port 3000)
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

### Web (`web/`)
```bash
pnpm dev      # next dev --turbo
pnpm build    # next build
pnpm lint     # eslint
```

### Docs (`docs/`)
Docusaurus site — rarely needed for development.

## Database & migrations

- PostgreSQL via Drizzle ORM. Schema: `api/src/db/schema/` (modular — 10 files + relations.ts).
- DB connection: `api/src/db/index.ts` — pg Pool with Neon scale-to-zero handling.
- **When changing the schema**: run `pnpm drizzle-kit generate` in `api/`, then **commit the generated `drizzle/*.sql` files**.
- Seed creates 5 default pipeline stages (Applied, Screening, Interviewed, Offer, Rejected). Required for the app to work.

## API architecture

- **Express 5** (not 4). Routes: `api/src/routes/index.ts`.
- **CommonJS** output (`tsconfig.json` `"module": "commonjs"`) despite TypeScript source. tsx handles dev transpilation transparently.
- **Auth**: JWT via WSO2 Asgardeo. Middleware: `api/src/middlewares/auth.middleware.ts` — verifies token, maps roles (`super_admin`, `hiring_manager`, `interviewer`), **auto-provisions users on first login**.
- **Request type augmentation**: `api/src/types/express.d.ts` adds `req.user` to Express Request.
- **`exactOptionalPropertyTypes: false`** in tsconfig — deliberate deviation from strict defaults.
- Public routes (`/public/*`) use origin-based access control, not auth middleware.
- Assessment endpoints (`/public/assessment/:token`) use token-based auth.
- Socket.IO runs on the same HTTP server, CORS set to `*`.
- Logger (winston): console transport only. File transports are commented out.

## Testing conventions

- **Tests live in `api/tests/`** and are **excluded from `tsconfig.json`** compilation (line 29). Run via vitest/tsx directly.
- **Tests define their own Zod schemas** — they do NOT import the actual service code or DB schemas. Each `*.service.test.ts` re-declares Zod validation rules to test business logic in isolation.
- **No DB in tests** — pure unit/schema validation.
- The only integration test is `tests/health.test.ts` (uses supertest against Express app).
- Security tests (`*.security.test.ts`) test for SQL injection and XSS via Zod validation.
- **No frontend tests** exist.

## Frontend quirks

- **force-dynamic** on root layout (`web/app/layout.tsx`) — entire app is SSR-disabled because AsgardeoProvider needs request context.
- Heavy components are code-split with `ssr: false` in `web/components/dynamic-imports.tsx`.
- Tailwind **v4** — CSS-first config (`@tailwindcss/postcss`), no `tailwind.config.ts`. Classes defined via `@theme` in CSS.
- shadcn/ui **base-vega** style with **hugeicons** as the icon library — not default shadcn.
- Path alias: `@/*` → `./*` (both `tsconfig.json` and Next.js).
- Server-side data fetching: `serverFetch` in `web/lib/auth-action.ts` (cached auth context via `React.cache()`).
- Client-side data fetching: `useApi` hook + React Query hooks in `web/hooks/queries/`.

## Environment variables

Two separate `.env` files needed (copy from `.env.example` in each):
- `api/.env` — DATABASE_URL, R2_*, RESEND_*, ASGARDEO_*, GEMINI_API_KEY
- `web/.env` — NEXT_PUBLIC_ASGARDEO_*, ASGARDEO_*, OPENATS_API_URL, NEXT_PUBLIC_API_URL

## Linting & formatting

- **Only `web/` has ESLint** (`eslint.config.mjs` — next/core-web-vitals + next/typescript). The API has no lint config.
- **No Prettier, no pre-commit hooks**, no formatting enforcement.

## CI/CD

- Single workflow: `.github/workflows/deploy.yml` — deploys **API only** to Azure VM on push to `main` (when `api/**` changes). SSH + git pull + pnpm install + build + pm2 restart.
- **No CI for web frontend**, no test running, no linting in CI.

## Known errors in CONTRIBUTING.md

- Line 162: says `cd apps/api` — correct is `cd api`
- Line 166: says port 5000 — correct port is **8080**
