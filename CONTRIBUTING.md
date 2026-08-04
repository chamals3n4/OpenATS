## Contributing to OpenATS

> 🔑 Setting up authentication? See [docs/IAM_SETUP.md](docs/IAM_SETUP.md) for the full WSO2 Identity Platform setup guide.

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
- [Working on a Task](#working-on-a-task)
  - [Before you start ANYTHING](#before-you-start-anything)
  - [Create a new branch for your task](#create-a-new-branch-for-your-task)
  - [Work on your code, then commit](#work-on-your-code-then-commit)
  - [Push your branch](#push-your-branch)
  - [Create Pull Request on GitHub](#create-pull-request-on-github)
- [Important Rules](#important-rules)

## Prerequisites

Before you start, make sure you have these installed:

- Node.js (version 18 or higher), [download here](https://nodejs.org/)
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
