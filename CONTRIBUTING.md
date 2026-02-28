## Contributing to OpenATS

- [Prerequisites](#prerequisites)
- [Tech Stack](#tech-stack)
- [Learning Resources](#learning-resources)
- [Initial Setup](#initial-setup)
  - [Fork and Clone](#1-fork-and-clone)
  - [Add Upstream Remote](#2-add-upstream-remote)
  - [Install pnpm](#3-install-pnpm)
  - [Install Dependencies](#4-install-dependencies)
- [Database Setup](#database-setup)
  - [Setup environment variables](#1-setup-environment-variables)
  - [Run database migrations](#2-run-database-migrations)
  - [Seed the database](#3-seed-the-database)
- [Running the Project](#running-the-project)
  - [Frontend](#frontend)
  - [Backend](#backend)
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
- A PostgreSQL database (we recommend [Neon](https://neon.tech) — free tier, no local install needed)
- A code editor (VS Code recommended)

Check if you have them:

```bash
node --version
git --version
```

## Tech Stack

**Frontend (web)**

- Next.js
- TypeScript
- Tailwind CSS
- shadcn/ui

**Backend (api)**

- Express.js
- TypeScript
- Node.js
- PostgreSQL (Database)
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
cd web
pnpm install
```

Backend:

```bash
cd api
pnpm install
```

## Database Setup

### 1. Setup environment variables

Inside `web`, copy the example env file:

```bash
cd web
cp .env.example .env
```

Then open `.env` and fill in the required values.

Inside `api`, copy the example env file:

```bash
cd api
cp .env.example .env
```

Then open `.env` and fill in your database URL:

```bash
DATABASE_URL=your_postgresql_connection_string_here
```

### 2. Run database migrations

This creates all the tables in your database:

```bash
pnpm drizzle-kit generate
pnpm drizzle-kit migrate
```

### 3. Seed the database

This inserts the default hiring pipeline stages required for the app to work:

```bash
pnpm tsx src/db/seed.ts
```

You only need to do steps 2 and 3 **once** when setting up for the first time.

> ⚠️ If you ever pull changes that include schema changes, run `pnpm drizzle-kit generate` and `pnpm drizzle-kit migrate` again to keep your database in sync.

## Running the Project

### Frontend

```bash
cd web
pnpm dev
```

Open `http://localhost:3000`

### Backend

```bash
cd apps/api
pnpm dev
```

Open `http://localhost:5000`

Run both in separate terminals.

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
