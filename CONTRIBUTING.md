## Contributing to OpenATS

> 🔑 Sign-in is built into OpenATS, so there is no outside account to set up. `make setup` creates your first admin. See [Sign-in and users](docs/docs/administration/authentication.md) for how accounts and roles work.

- [Prerequisites](#prerequisites)
- [Tech Stack](#tech-stack)
- [Quick Start (Recommended)](#quick-start-recommended)
- [Manual Setup](#manual-setup)
  - [Fork and Clone](#1-fork-and-clone)
  - [Add Upstream Remote](#2-add-upstream-remote)
  - [Install pnpm](#3-install-pnpm)
  - [Install Dependencies](#4-install-dependencies)
- [Database Setup](#database-setup)
  - [Start Postgres and Redis with Docker](#1-start-postgres-and-redis-with-docker)
  - [Setup environment variables](#2-setup-environment-variables)
  - [Run database migrations](#3-run-database-migrations)
  - [Seed the database](#4-seed-the-database)
  - [Create your first admin](#5-create-your-first-admin)
- [Running the Project](#running-the-project)
  - [Frontend](#frontend)
  - [Backend](#backend)
  - [Backend Worker](#backend-worker)
- [Testing](#testing)
- [Working on a Task](#working-on-a-task)
  - [Before you start ANYTHING](#before-you-start-anything)
  - [Create a new branch for your task](#create-a-new-branch-for-your-task)
  - [Work on your code, then commit](#work-on-your-code-then-commit)
  - [Push your branch](#push-your-branch)
  - [Create Pull Request on GitHub](#create-pull-request-on-github)
- [Important Rules](#important-rules)

## Prerequisites

Before you start, make sure you have these installed:

- Node.js (version 22 or higher), [download here](https://nodejs.org/)
- Git, [download here](https://git-scm.com/)
- Docker, [download here](https://docs.docker.com/get-docker/) (runs Postgres and Redis locally, no manual DB install needed)
- Make (usually preinstalled on macOS and Linux, on Windows use WSL)
- A code editor (VS Code recommended)

Check if you have them:

```bash
node --version
git --version
docker --version
make --version
```

## Tech Stack

**Frontend (web)**

- Next.js
- TypeScript
- Tailwind CSS
- shadcn/ui (for UI components)

**Backend (api)**

- Express.js
- TypeScript
- Node.js
- PostgreSQL (database)
- Redis (job queue, via BullMQ)
- Drizzle ORM (database ORM)
- Better Auth (sign-in, built in and running in the Next.js server)

**Package Manager:** pnpm, managed as a single workspace from the repo root

## Quick Start (Recommended)

If you have `make` installed, this is the fastest way to get running:

```bash
git clone https://github.com/chamals3n4/OpenATS.git
cd OpenATS
make setup
make dev
```

`make setup` does all of this for you, in order:

1. Installs dependencies for both `backend` and `frontend` from the root, using pnpm workspaces
2. Copies `backend/.env.example` and `frontend/.env.example` into real `.env` files, if they don't exist yet
3. Generates a random `ENCRYPTION_KEY` for you, if it's still blank
4. Fills in what sign-in needs in `frontend/.env` (`BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `DATABASE_URL`), if they're still blank
5. Starts Postgres and Redis via Docker
6. Runs database migrations and seeds the default pipeline stages
7. Asks for an email, a name and a password, and creates your first super admin

`make dev` then starts the backend and frontend together. Sign in at `http://localhost:3000` with the admin you just created.

You'll still need to fill in a few provider credentials by hand afterward, since these are personal secrets nobody can generate for you: Cloudflare R2 and Resend, plus Gemini and Google OAuth if you want those features. Each `.env.example` says what every value is for and which ones are optional.

Prefer to see every step yourself, or something in `make setup` isn't working? The full manual walkthrough is below, and it's also the fallback if you ever need to debug a step individually.

## Manual Setup

### 1. Fork and Clone

Fork the repository on GitHub first, then:

```bash
git clone https://github.com/chamals3n4/OpenATS.git
cd OpenATS
```

### 2. Add Upstream Remote

```bash
git remote add upstream https://github.com/chamals3n4/OpenATS.git
git remote -v  # verify you have both origin and upstream
```

### 3. Install pnpm

```bash
npm install -g pnpm
```

### 4. Install Dependencies

From the repo root, this installs both `frontend` and `backend` in one go, since they're managed as a single pnpm workspace:

```bash
pnpm install
```

## Database Setup

### 1. Start Postgres and Redis with Docker

The backend needs a PostgreSQL database and a Redis instance (used for the CV analysis job queue via BullMQ). A `docker-compose.yml` is provided at the repo root, so you don't need to install or configure either manually:

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

Remove the containers (data volumes are preserved unless you add `-v`):

```bash
docker compose down
```

### 2. Setup environment variables

Inside `frontend`, copy the example env file:

```bash
cd frontend
cp .env.example .env
cd ..
```

Inside `backend`, copy the example env file:

```bash
cd backend
cp .env.example .env
cd ..
```

If you're using the Docker containers from step 1, `DATABASE_URL` and `REDIS_URL` in `backend/.env` are already filled in correctly by default:

```bash
DATABASE_URL=postgresql://openats:openats@localhost:5432/openats
REDIS_URL=redis://localhost:6379
```

Sign-in needs three more values in `frontend/.env`, and one key in `backend/.env`. The quickest way is to let Make fill in whatever is still blank:

```bash
make encryption-key auth-env
```

To do it by hand instead, set these (the two secrets can each be generated with `openssl rand -base64 32`):

```bash
# backend/.env
ENCRYPTION_KEY=<generated value>

# frontend/.env
DATABASE_URL=postgresql://openats:openats@localhost:5432/openats   # same as the backend
BETTER_AUTH_SECRET=<generated value, at least 32 characters>
BETTER_AUTH_URL=http://localhost:3000
```

`AUTH_JWKS_URL` and `AUTH_ISSUER` in `backend/.env` are already right for local use.

### 3. Run database migrations

```bash
make migrate
```

### 4. Seed the database

This inserts the default hiring pipeline stages the app needs to work:

```bash
make seed
```

### 5. Create your first admin

There is no public sign-up, so the first account is created from the command line. It asks for an email, a name and a password:

```bash
make admin
```

Run it after the migrations, because it needs the tables to exist. You can run it again at any time to add another super admin, or to reset one if you are locked out.

You only need steps 3 to 5 **once**, when setting up for the first time.

> ⚠️ If you pull changes that include schema changes, run `make migrate` again to keep your database in sync.

## Running the Project

The fastest way is one command from the repo root. It starts Postgres and Redis, then the backend and frontend together:

```bash
make dev
```

Frontend runs on `http://localhost:3000`, backend on `http://localhost:8080`.

### Frontend

```bash
pnpm dev:frontend
```

### Backend

```bash
pnpm dev:backend
```

### Backend Worker

CV analysis runs as a background job queue and needs its own process, separate from the API server:

```bash
pnpm --filter ./backend dev:worker
```

## Testing

Full guide: [docs/docs/developer/testing.md](docs/docs/developer/testing.md).

There are three kinds of tests:

- **Unit tests** check a single function with no database.
- **Integration tests** check API routes against a real database.
- **End-to-end tests** open a real browser and use the app like a person would.

### First time only

Start the test database and apply the schema to it:

```bash
docker compose up -d postgres-test
cd backend
DATABASE_URL=postgresql://openats:openats@localhost:5433/openats_test pnpm drizzle-kit migrate
cd ..
```

> ⚠️ Note the port is **5433**, not 5432. Tests use their own database so they never touch your development data.

### Running tests

```bash
pnpm test        # unit and integration tests
pnpm test:e2e    # end-to-end tests (stop `make dev` first)
```

Playwright starts its own servers on ports 3000 and 8080, so `make dev` must not be running or you will get an `EADDRINUSE` error.

Please run `pnpm test` before opening a pull request. CI runs the same tests plus a type check and a build on every PR.

## Working on a Task

### Before you start ANYTHING:

```bash
git checkout main
git pull upstream main
git push origin main
```

### Create a new branch for your task:

```bash
git checkout -b feature/task-name
# or
git checkout -b fix/bug-name
```

### Work on your code, then commit:

```bash
git add .
git commit -m "brief description of what you did"
```

### Push your branch:

```bash
git push origin feature/task-name
```

### Create Pull Request on GitHub

Go to GitHub and create a PR from your branch to `main` of the main repository.

**The PR title matters.** We squash merge, so your whole PR becomes one commit on `main` and the PR title becomes the commit message. Use this format:

```
type: short description
```

| Type | Use it for | Example |
|---|---|---|
| `feat` | A new feature | `feat: add bulk candidate import` |
| `fix` | A bug fix | `fix: resume upload fails on large files` |
| `docs` | Documentation only | `docs: update the sign-in guide` |
| `refactor` | Code change with no behavior change | `refactor: simplify CV parser` |
| `test` | Adding or fixing tests | `test: add pipeline stage tests` |
| `chore` | Tooling, deps, config | `chore: update eslint config` |

For a breaking change, add `!` after the type, like `feat!: change job API response shape`.

Your individual commit messages inside the PR can be anything, since they get squashed.

### After your PR is merged

Delete your branch and start fresh for the next task. Don't keep working on a merged branch, because the squashed commit on `main` won't match it and you'll get conflicts.

```bash
git checkout main
git pull upstream main
git branch -D feature/task-name
```

## Releases

Releases are automated. Please don't edit `CHANGELOG.md` or bump version numbers in your PR. The changelog and version are generated from PR titles when a release is cut.

## Important Rules

- NEVER push directly to main (it's protected, so it won't work anyway)
- ALWAYS pull from upstream before starting work
- Create a NEW branch for each task, and don't reuse a branch after it's merged
- One PR, one change. Don't mix a feature and an unrelated fix
- Use the PR title format above (`feat: ...`, `fix: ...`)
- Run `pnpm test` before pushing
- If you modify the database schema, always run `make migrate` and commit the generated migration files along with your schema changes

---

Happy coding!
