# Running OpenATS with Docker

This runs the whole system — Postgres, Redis, the API, the CV analysis worker
and the frontend — with one command.

If you only want Postgres and Redis in containers and would rather run the app
with `pnpm dev`, use `backend/docker-compose.yml` instead and follow
[CONTRIBUTING.md](../CONTRIBUTING.md). The two setups are independent; running
both at once will fight over ports 5432 and 6379.

- [Quick start](#quick-start)
- [What you get](#what-you-get)
- [Configuration](#configuration)
- [Migrations and seeding](#migrations-and-seeding)
- [Everyday commands](#everyday-commands)
- [Troubleshooting](#troubleshooting)

## Quick start

You need Docker with Compose v2 (`docker compose version`). Nothing else —
no Node, no pnpm.

```bash
cp .env.example .env
docker compose up -d --build
docker compose --profile seed run --rm seed   # first time only
```

- Frontend: http://localhost:3000
- API: http://localhost:8080
- API docs: http://localhost:8080/api-docs

**The frontend needs a real Asgardeo tenant before it will render.** Out of the
box the API comes up healthy and the public endpoints work, but every frontend
page returns 500 until you fill in the Asgardeo values — the root layout renders
through `AsgardeoProvider`, which refuses to initialize without them. See
[IAM_SETUP.md](./IAM_SETUP.md). While you're in that block, also set
`ASGARDEO_SECRET` (any long random string — `openssl rand -base64 32`): the
production build refuses to sign users in without it. Then:

```bash
docker compose up -d --build frontend
```

The rebuild matters for `NEXT_PUBLIC_ASGARDEO_BASE_URL` and
`NEXT_PUBLIC_ASGARDEO_CLIENT_ID`, which are compiled into the browser bundle.
`NEXT_PUBLIC_ASGARDEO_SCOPES`, `NEXT_PUBLIC_ASGARDEO_ORGANIZATION_HANDLE` and
the server-only `ASGARDEO_*` values are read at runtime — a restart is enough
for those.

## What you get

| Service    | Image                | Port | Notes                                        |
| ---------- | -------------------- | ---- | -------------------------------------------- |
| `frontend` | built from `frontend/` | 3000 | Next.js standalone output                    |
| `backend`  | built from `backend/`  | 8080 | API + Socket.IO, has a `/health` check       |
| `worker`   | same image as backend  | —    | CV analysis queue consumer                   |
| `migrate`  | backend `migrator` target | — | Runs once on `up`, then exits                |
| `seed`     | backend `migrator` target | — | Opt-in, see below                            |
| `postgres` | postgres:16-alpine   | 5432 | Data in the `postgres-data` volume           |
| `redis`    | redis:7-alpine       | 6379 | Data in the `redis-data` volume              |

`worker` is a separate process on purpose — without it, CV analysis jobs pile up
in Redis and are never processed.

## Configuration

Everything lives in the root `.env` (copied from `.env.example`). It is only
used by `docker-compose.yml`; `backend/.env` and `frontend/.env` are for the
`pnpm dev` workflow and are ignored here.

Two API URLs exist because the browser and the Next.js server reach the API by
different routes:

- `NEXT_PUBLIC_API_URL` — used by the browser. Must be an address **you** can
  reach, so `http://localhost:8080`. Compiled into the bundle at build time.
- `OPENATS_API_URL` — used by server components. Resolves over the Docker
  network, so `http://backend:8080`.

Three values ship as placeholders because the backend reads them at module
scope and crash-loops on startup if they are empty, rather than just disabling
the feature:

| Variable            | Placeholder effect                                    |
| ------------------- | ----------------------------------------------------- |
| `RESEND_API_KEY`    | API boots; every email send fails — and interview invites and application confirmations fail *silently* (logged only, the API still returns success), so candidates simply never hear anything |
| `GEMINI_API_KEY`    | API boots; CV analysis fails in the worker             |
| `ASGARDEO_JWKS_URL` | API boots; every authenticated route 401s, and the logs show `ENOTFOUND jwks-not-configured.invalid` |

Replace them with real values to use those features. To point at a hosted
Postgres (Neon) instead of the container, set `DATABASE_URL` — the `postgres`
service then just sits unused.

If a port is taken, override it: `FRONTEND_PORT`, `BACKEND_PORT`,
`POSTGRES_PORT`, `REDIS_PORT`.

## Migrations and seeding

Migrations run automatically: the `migrate` service applies
`backend/drizzle/*.sql` and must exit successfully before the API and worker
start. Pulling schema changes just means `docker compose up -d --build` again.

Seeding is deliberately **not** automatic. `backend/src/db/seed.ts` deletes every
row in `pipeline_stage_templates` before reinserting the 7 defaults, so running
it on every `up` would discard templates you had customised. Run it by hand on
first setup:

```bash
docker compose --profile seed run --rm seed
```

The app needs those stages to function, so don't skip it on a fresh database.

## Everyday commands

```bash
docker compose logs -f backend worker            # follow logs
docker compose up -d --build backend worker      # rebuild after backend changes (they share the image)
docker compose restart worker
docker compose ps                                # health status
docker compose exec postgres psql -U openats -d openats
docker compose down                              # stop; data survives
docker compose down -v                           # stop and delete the data volumes
```

To generate a migration after changing the schema without installing pnpm
locally, run drizzle-kit in the migrator image **with your working tree
mounted** — the mounts matter: drizzle-kit must read your *edited* schema (the
copy baked into the image is stale until a rebuild), and the generated SQL
must land on the host or it is deleted with the `--rm` container:

```bash
docker compose run --rm \
  -v "$PWD/backend/src:/app/src" \
  -v "$PWD/backend/drizzle:/app/drizzle" \
  migrate pnpm drizzle-kit generate
```

(If you have Node and pnpm, `cd backend && pnpm drizzle-kit generate` does the
same thing.) Either way, commit the generated `backend/drizzle/*.sql` files,
as CONTRIBUTING.md requires.

## Troubleshooting

**`backend` is unhealthy / restarting.** Check `docker compose logs backend`.
A crash at startup on `Invalid URL` means `ASGARDEO_JWKS_URL` is empty, and
`Missing API key` means `RESEND_API_KEY` is empty. Copying `.env.example`
supplies working placeholders for both.

**Every authenticated route 401s after setting up Asgardeo.** If the logs show
`ENOTFOUND jwks-not-configured.invalid`, the `ASGARDEO_JWKS_URL` placeholder
was left in place — replace it with your tenant's real JWKS URL and restart
the backend.

**Frontend returns 500 on every page.** Asgardeo is not configured — see
[IAM_SETUP.md](./IAM_SETUP.md). Rebuild rather than restart afterwards.

**Sign-in fails even though Asgardeo is configured.** `ASGARDEO_SECRET` is
probably unset — the production build requires it to sign the session cookie.
Set it in `.env` and restart the frontend.

**Changed a `NEXT_PUBLIC_*` value and nothing happened.** Most of those are
baked into the bundle at build time: `docker compose up -d --build frontend`.
(The exceptions are the two Asgardeo runtime values noted in the quick start.)

**`address already in use`.** Something else holds the port. Set
`FRONTEND_PORT=3100` (or similar) in `.env` — but the origin change has to be
carried through, or the app breaks in new ways: set
`FRONTEND_URL=http://localhost:3100` too (it is the API's CORS allowlist *and*
the base for links in outgoing emails — restart backend), set
`NEXT_PUBLIC_APP_URL=http://localhost:3100` (baked into the bundle — rebuild
frontend), and update the authorized redirect URL in your Asgardeo app. If the
clash is on 5432/6379, it is probably `backend/docker-compose.yml` — stop that
instead.

**Login redirects back to the login page.** `FRONTEND_URL` (the API's CORS
allowlist) must match the origin you load in the browser.
