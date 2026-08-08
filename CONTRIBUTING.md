## Contributing to OpenATS

> 🔑 Setting up authentication? See [docs-draft/IAM_SETUP.md](docs-draft/IAM_SETUP.md) for the full WSO2 Identity Platform setup guide.

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
  - [Set up your Asgardeo M2M application](#3-set-up-your-asgardeo-m2m-application)
  - [Run the Asgardeo setup script](#4-run-the-asgardeo-setup-script)
  - [Run database migrations](#5-run-database-migrations)
  - [Seed the database](#6-seed-the-database)
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
- WSO2 Asgardeo (authentication)

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
4. Starts Postgres and Redis via Docker
5. Walks you through setting up your own Asgardeo tenant, interactively, and prints the values it configured
6. Runs database migrations and seeds the default pipeline stages

`make dev` then starts the backend, frontend, and CV analysis worker together.

You'll still need to fill in a few provider credentials by hand afterward, since these are personal secrets nobody can generate for you: Cloudflare R2, Resend, Gemini, and Google OAuth. `make setup` prints exactly which `.env` values it already configured and which ones are still blank, so you know what's left.

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

### 3. Set up your Asgardeo M2M application

OpenATS uses WSO2 Asgardeo for login and user management. You need your own free tenant.

Follow [docs-draft/IAM_SETUP.md](docs-draft/IAM_SETUP.md) to create the application and get your Base URL, Client ID, and Client Secret. Put them in `frontend/.env` and `backend/.env` as the guide describes.

### 4. Run the Asgardeo setup script

This creates the roles OpenATS expects (`super_admin`, `hiring_manager`, `interviewer`) in your tenant and writes the role IDs into `backend/.env`:

```bash
make asgardeo
```

Or run it directly with `./setup-asgardeo.sh`.

### 5. Run database migrations

```bash
make migrate
```

### 6. Seed the database

This inserts the default hiring pipeline stages the app needs to work:

```bash
make seed
```

You only need steps 3 to 6 **once**, when setting up for the first time.

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

Full guide: [docs-draft/TESTING.md](docs-draft/TESTING.md).

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

Go to GitHub and create a PR from your branch to the main repository.

## Important Rules

- NEVER push directly to main
- ALWAYS pull from upstream before starting work
- Create a NEW branch for each task
- Keep commits small and focused
- Run `pnpm test` before pushing
- If you modify the database schema, always run `make migrate` and commit the generated migration files along with your schema changes

---

Happy coding!
