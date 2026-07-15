## Contributing to OpenATS

> 🔑 Setting up authentication? See [docs/IAM_SETUP.md](docs/IAM_SETUP.md) for the full WSO2 Identity Platform setup guide.

> 🐳 This guide runs the app with `pnpm dev` and uses Docker only for Postgres and Redis. To run the whole stack in containers instead, see [docs/DOCKER.md](docs/DOCKER.md).

- [Prerequisites](#prerequisites)
- [Tech Stack](#tech-stack)
- [Initial Setup](#initial-setup)
  - [Fork and Clone](#1-fork-and-clone)
  - [Add Upstream Remote](#2-add-upstream-remote)
  - [Install pnpm](#3-install-pnpm)
  - [Install Dependencies](#4-install-dependencies)
- [Database Setup](#database-setup)
  - [Start Postgres and Redis with Docker](#1-start-postgres-and-redis-with-docker)
  - [Setup environment variables](#2-setup-environment-variables)
  - [Run database migrations](#3-run-database-migrations)
  - [Seed the database](#4-seed-the-database)
- [Running the Project](#running-the-project)
  - [Frontend](#frontend)
  - [Backend](#backend)
  - [Backend Worker](#backend-worker)
- [Working on a Task](#working-on-a-task)
  - [Before you start ANYTHING](#before-you-start-anything)
  - [Create a new branch for your task](#create-a-new-branch-for-your-task)
  - [Work on your code, then commit](#work-on-your-code-then-commit)
  - [Push your branch](#push-your-branch)
  - [Create Pull Request on GitHub](#create-pull-request-on-github)
- [Important Rules](#important-rules)

## Prerequisites

Before you start, make sure you have these installed:

- Node.js (version 18 or higher) - [Download here](https://nodejs.org/)
- Git - [Download here](https://git-scm.com/)
- Docker - [Download here](https://docs.docker.com/get-docker/) (runs Postgres and Redis locally - no manual DB install needed)
- A code editor (VS Code recommended)

Check if you have them:

```bash
node --version
git --version
docker --version
```

## Tech Stack

**Frontend (web)**

- Next.js
- TypeScript
- Tailwind CSS
- shadcn/ui ( for ui componenents)

**Backend (api)**

- Express.js
- TypeScript
- Node.js
- PostgreSQL (Database)
- Redis (Job queue, via BullMQ)
- Drizzle ORM (Database ORM)
- WSO2 Asgardeo (Authentication)

**Package Manager:** pnpm

## Initial Setup

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

Frontend:

```bash
cd frontend
pnpm install
```

Backend:

```bash
cd backend
pnpm install
```

## Database Setup

### 1. Start Postgres and Redis with Docker

The backend needs a PostgreSQL database and a Redis instance (used for the CV analysis job queue via BullMQ). A `docker-compose.yml` is provided in `backend/` so you don't need to install or configure either manually:

```bash
cd backend
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

Remove the containers (data volume is preserved unless you add `-v`):

```bash
docker compose down
```

### 2. Setup environment variables

Inside `frontend`, copy the example env file:

```bash
cd frontend
cp .env.example .env
```

Then open `.env` and fill in the required values.

Inside `backend`, copy the example env file:

```bash
cd backend
cp .env.example .env
```

Then open `.env` and fill in the values. If you're using the Docker containers from step 1, `DATABASE_URL` and `REDIS_URL` are:

```bash
DATABASE_URL=postgresql://openats:openats@localhost:5432/openats
REDIS_URL=redis://localhost:6379
```

The remaining variables are for external/cloud services and are only needed if you're working on the feature that depends on them:

- `ASGARDEO_*` - WSO2 Asgardeo auth. Required for almost everything - most routes are gated behind the auth middleware. See [docs/IAM_SETUP.md](docs/IAM_SETUP.md) for a full walkthrough of setting up your own Asgardeo application.
- `R2_*` - Cloudflare R2 object storage, used for file uploads (e.g. resumes).
- `RESEND_*` - Resend API, used for sending emails (e.g. application confirmations).
- `GEMINI_API_KEY` - Used by the CV analysis service.
- `GOOGLE_SERVICE_ACCOUNT_JSON` and `GOOGLE_CALENDAR_ID` - used for Google Calendar integration (interview scheduling). The backend authenticates as a service account, so these are the only Google-related variables needed.

### 3. Run database migrations

This creates all the tables in your database:

```bash
pnpm drizzle-kit generate
pnpm drizzle-kit migrate
```

### 4. Seed the database

This inserts the default hiring pipeline stages required for the app to work:

```bash
pnpm tsx src/db/seed.ts
```

You only need to do steps 3 and 4 **once** when setting up for the first time.

> ⚠️ If you ever pull changes that include schema changes, run `pnpm drizzle-kit generate` and `pnpm drizzle-kit migrate` again to keep your database in sync.

## Running the Project

### Frontend

```bash
cd frontend
pnpm dev
```

Open `http://localhost:3000`

### Backend

```bash
cd backend
pnpm dev
```

Open `http://localhost:5000`

### Backend Worker

CV analysis runs as a background job queue and needs its own process, separate from the API server:

```bash
cd backend
pnpm dev:worker
```

Run the frontend, backend, and backend worker each in their own terminal.

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
- Test your code before pushing
- If you modify the database schema, always run `pnpm drizzle-kit generate` and commit the generated migration files along with your schema changes

---

Happy coding!
