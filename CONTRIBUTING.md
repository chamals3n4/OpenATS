# Contributing to OpenATS

Thank you for helping build OpenATS. This guide covers everything you need to set up the project, make a change and open a pull request.

## Contents

- [Prerequisites](#prerequisites)
- [Project layout](#project-layout)
- [Quick start](#quick-start)
- [Manual setup](#manual-setup)
  - [1. Fork and clone](#1-fork-and-clone)
  - [2. Install dependencies](#2-install-dependencies)
  - [3. Start Postgres, Redis and Mailpit](#3-start-postgres-redis-and-mailpit)
  - [4. Set up environment variables](#4-set-up-environment-variables)
  - [5. Prepare the database](#5-prepare-the-database)
- [Running the project](#running-the-project)
- [Make commands](#make-commands)
- [Changing the database schema](#changing-the-database-schema)
- [Testing](#testing)
- [Working on a task](#working-on-a-task)
- [Opening a pull request](#opening-a-pull-request)
- [Releases](#releases)
- [Rules](#rules)
- [Getting help](#getting-help)

## Prerequisites

| Tool | Version | Notes |
| --- | --- | --- |
| [Node.js](https://nodejs.org/) | 24 | The exact version is in `.nvmrc`. With nvm, run `nvm use` |
| [pnpm](https://pnpm.io/) | Latest | See [Install pnpm](#install-pnpm) below |
| [Docker](https://docs.docker.com/get-docker/) | With Compose | Runs Postgres, Redis and Mailpit, so you don't install them yourself |
| [Git](https://git-scm.com/) | Any recent version | |
| `make` | Any | Preinstalled on macOS and Linux. On Windows, use WSL |
| `openssl` | Any | Used by `make setup` to generate secrets |

### Install pnpm

Use the standalone script from the [pnpm docs](https://pnpm.io/installation). It does not need Node.js.

```bash
# macOS, Linux and WSL
curl -fsSL https://get.pnpm.io/install.sh | sh -

# If you don't have curl
wget -qO- https://get.pnpm.io/install.sh | sh -
```

```powershell
# Windows (PowerShell)
Invoke-WebRequest https://get.pnpm.io/install.ps1 -UseBasicParsing | Invoke-Expression
```

Restart your terminal afterwards so that the `pnpm` command is available. The repository pins its pnpm version in `package.json`, and pnpm switches to that version on its own.

### Check your tools

Check that you have them:

```bash
node --version    # v24.x
pnpm --version
docker compose version
git --version
make --version
```

## Project layout

OpenATS is one pnpm workspace with two packages, installed together from the repository root.

| Path | What it holds |
| --- | --- |
| `frontend/` | The Next.js web app: the dashboard, careers page and sign-in. Runs on port 3000 |
| `backend/` | The Express API (port 8080) and the background worker |
| `backend/src/modules/` | One folder per feature |
| `backend/src/db/schema/` | The Drizzle database schema |
| `backend/drizzle/` | Generated SQL migrations. Always committed |
| `e2e/` | Playwright end-to-end tests |
| `docs/` | The documentation site |

Read the [architecture guide](docs/docs/developer/architecture.md) before a larger change. It explains how the web app, API and worker fit together, and the rules for each layer.

| Part | Built with |
| --- | --- |
| Web app | Next.js, TypeScript, Tailwind CSS, shadcn/ui, React Query, Better Auth |
| API and worker | Express 5, TypeScript, Socket.IO, BullMQ |
| Data | PostgreSQL with Drizzle ORM, Redis |

## Quick start

If you have `make`, this is the fastest way to get running:

```bash
git clone https://github.com/<your-username>/OpenATS.git
cd OpenATS
make setup
make dev
```

`make setup` does all of this, in order:

1. Installs the dependencies for `frontend` and `backend`.
2. Creates `backend/.env` and `frontend/.env` from their `.env.example` files, if they don't exist yet.
3. Generates an `ENCRYPTION_KEY` for the backend, if it is blank.
4. Fills in `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL` and `DATABASE_URL` in `frontend/.env`, if they are blank.
5. Starts Postgres, Redis and Mailpit in Docker.
6. Runs the database migrations and seeds the default pipeline stages.
7. Asks for an email, a name and a password, and creates your first super admin.

`make dev` then starts the API, the worker and the web app together. Open http://localhost:3000 and sign in with the admin you created.

**Before you upload a CV**, fill in the `R2_*` values in `backend/.env`. Storage credentials can't be generated for you. Gemini (`GEMINI_API_KEY`) and Google Calendar (`GOOGLE_OAUTH_*`) are optional. Each `.env.example` explains every value and says which ones are optional.

If `make setup` fails, or you want to see each step, follow the manual setup below. It is also the way to debug a single step.

## Manual setup

### 1. Fork and clone

Fork the repository on GitHub, then clone **your fork** and add the main repository as `upstream`:

```bash
git clone https://github.com/<your-username>/OpenATS.git
cd OpenATS
git remote add upstream https://github.com/chamals3n4/OpenATS.git
git remote -v    # you should see both origin and upstream
```

### 2. Install dependencies

From the repository root, this installs both packages:

```bash
pnpm install
```

### 3. Start Postgres, Redis and Mailpit

The `docker-compose.yml` at the root starts everything the app depends on:

```bash
docker compose up -d     # or: make infra-up
```

| Service | Address | What it is for |
| --- | --- | --- |
| Postgres | `localhost:5432` | The database. User, password and database name are all `openats` |
| Redis | `localhost:6379` | The job queue for the worker |
| Mailpit | Inbox at http://localhost:8025, SMTP on port 1025 | Catches every email the app sends, so nothing reaches a real inbox |

```bash
docker compose ps        # check they are running
docker compose stop      # stop them for the day. Your data is kept
docker compose down      # remove the containers. Your data is kept unless you add -v
```

### 4. Set up environment variables

Copy both example files:

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

The defaults already point at the Docker services from step 3, including `DATABASE_URL`, `REDIS_URL`, the Mailpit SMTP settings, and `AUTH_JWKS_URL` and `AUTH_ISSUER`.

Then fill in the secrets. The quickest way is to let `make` fill in whatever is blank:

```bash
make encryption-key auth-env
```

To do it by hand, set these values. Generate each secret with `openssl rand -base64 32`.

```bash
# backend/.env
ENCRYPTION_KEY=<generated value>

# frontend/.env
DATABASE_URL=postgresql://openats:openats@localhost:5432/openats   # same as the backend
BETTER_AUTH_SECRET=<generated value, at least 32 characters>
BETTER_AUTH_URL=http://localhost:3000
```

Finally, add your `R2_*` storage values to `backend/.env` before you upload CVs.

### 5. Prepare the database

Run these once, in this order:

```bash
make migrate   # create the tables
make seed      # add the default hiring pipeline stages
make admin     # create your first super admin. There is no public sign-up
```

You can run `make admin` again at any time to add another super admin, or to get back in if you are locked out.

When you pull changes that include new migrations, run `make migrate` again.

## Running the project

Start everything with one command from the repository root:

```bash
make dev
```

This starts the Docker services, then runs three processes together:

| Process | Address | Run it on its own |
| --- | --- | --- |
| Web app | http://localhost:3000 | `pnpm dev:frontend` |
| API | http://localhost:8080 | `pnpm dev:backend` |
| Worker | (no port) | `pnpm --filter ./backend dev:worker` |

**The worker is required.** It reads the text of uploaded CVs, deletes the files of removed candidates and writes AI notes. Without it, CVs stay "pending". If you run the processes separately, start the worker as well.

Emails that the app sends appear in Mailpit at http://localhost:8025.

## Make commands

| Command | What it does |
| --- | --- |
| `make setup` | First-time setup: everything in [Quick start](#quick-start) |
| `make dev` | Start the Docker services, API, worker and web app |
| `make infra-up` / `make infra-down` | Start or remove the Docker services |
| `make migrate` | Generate migrations from schema changes and apply them |
| `make seed` | Add the default pipeline stages |
| `make admin` | Create a super admin, or reset one |
| `make encryption-key auth-env` | Fill in any blank secrets in the `.env` files |
| `make lint` | Lint both packages |
| `make test` | Run unit and integration tests |
| `make test-e2e` | Run the end-to-end tests |
| `make build` | Build both packages |
| `make clean` | Delete every `node_modules` folder |

## Changing the database schema

1. Edit the schema in `backend/src/db/schema/`.
2. Run `make migrate`. It generates a new SQL migration in `backend/drizzle/` and applies it to your database.
3. Commit the schema change **and** the generated migration files together.

Never edit a migration that has already been merged. Make a new one instead.

The tables that Better Auth uses are part of the same schema. CI checks that they still match what Better Auth expects, so if you change them, or `frontend/lib/auth/options.ts`, run the tests before you push.

## Testing

There are three kinds of tests:

| Kind | What it checks | Needs |
| --- | --- | --- |
| Unit | A single function, with no database | Nothing |
| Integration | API routes against a real database | The test database |
| End-to-end | The app in a real browser, used like a person would | The test database, and `make dev` stopped |

### Start the test database

Tests use their own Postgres on port **5433**, so they never touch your development data. It keeps its data in memory, so it is empty every time it starts. Migrate it after each start:

```bash
docker compose -f docker-compose.test.yml up -d
cd backend
DATABASE_URL=postgresql://openats:openats@localhost:5433/openats_test pnpm drizzle-kit migrate
cd ..
```

Check the port in that command. With 5432, the migration runs against your development database instead.

### Run the tests

```bash
pnpm test        # unit and integration tests
pnpm test:e2e    # end-to-end tests
```

Playwright starts its own servers on ports 3000 and 8080. Stop `make dev` first, or the end-to-end tests fail with an `EADDRINUSE` error.

On every pull request, CI runs the linter, the tests, type checks and a build. Run `make lint` and `pnpm test` before you push so you see problems first. The [testing guide](docs/docs/developer/testing.md) has more detail.

## Working on a task

**1. Update your `main` branch** before you start anything:

```bash
git checkout main
git pull upstream main
git push origin main
```

**2. Create a branch** for the task:

```bash
git checkout -b feature/short-name   # a new feature
git checkout -b fix/short-name       # a bug fix
```

**3. Make your change and commit it.** Commit messages inside your branch can be anything, because they are squashed when the pull request is merged.

```bash
git add .
git commit -m "describe what you did"
```

**4. Push the branch** to your fork:

```bash
git push origin feature/short-name
```

## Opening a pull request

On GitHub, open a pull request from your branch to `main` in the main repository, and fill in the pull request template.

**The title matters.** Pull requests are squash merged, so the title becomes the commit message on `main` and the changelog entry. Use this format:

```
type: short description
```

| Type | Use it for | Example |
| --- | --- | --- |
| `feat` | A new feature | `feat: add bulk candidate import` |
| `fix` | A bug fix | `fix: resume upload fails on large files` |
| `docs` | Documentation only | `docs: update the sign-in guide` |
| `refactor` | A code change that does not change behaviour | `refactor: simplify CV parser` |
| `test` | Adding or fixing tests | `test: add pipeline stage tests` |
| `chore` | Tooling, dependencies or configuration | `chore: update eslint config` |

For a breaking change, add `!` after the type, for example `feat!: change job API response shape`.

**After your pull request is merged**, delete the branch and start the next task from a fresh `main`. The squashed commit on `main` won't match your old branch, so reusing it causes conflicts.

```bash
git checkout main
git pull upstream main
git branch -D feature/short-name
```

## Releases

Releases are automated. Don't edit `CHANGELOG.md` or change version numbers in your pull request. The version and changelog are generated from pull request titles when a release is made.

## Rules

- Never push to `main` directly. It is protected.
- Pull from `upstream` before you start any work.
- Use a new branch for each task, and don't reuse a branch after it is merged.
- Keep each pull request to one change. Don't mix a feature with an unrelated fix.
- Use the `type: description` format for pull request titles.
- Run `make lint` and `pnpm test` before you push.
- When you change the schema, commit the generated migration files with it.

## Getting help

- Setup problems: see [Troubleshooting](docs/docs/getting-started/troubleshooting.md).
- How the system works: see the [architecture guide](docs/docs/developer/architecture.md).
- Questions and ideas: open an issue on GitHub.
- Security issues: follow [SECURITY.md](SECURITY.md). Do not open a public issue.

By contributing, you agree to follow the [Code of Conduct](CODE_OF_CONDUCT.md).