---
sidebar_position: 1
title: Quick Start
---

`make setup` is the recommended first-time setup command. Run it from the repository root. It automates the repeatable local setup steps, then tells you exactly which provider secrets still need to be added.

## What you need first

- Node.js 22 or later
- pnpm
- Docker and Docker Compose
- `make` and `openssl`

You do not need an account with any outside service to get signed in. Sign-in is built into OpenATS.

## Run setup

```sh
make setup
```

The command does the following, in order:

1. Installs dependencies for backend and frontend from the root with pnpm workspaces.
2. Copies `backend/.env.example` and `frontend/.env.example` to real `.env` files when they do not already exist.
3. Generates a random `ENCRYPTION_KEY` in `backend/.env` if it is blank.
4. Fills in what sign-in needs in `frontend/.env`: a random `BETTER_AUTH_SECRET`, the `DATABASE_URL` from the backend, and `BETTER_AUTH_URL`. Values you already set are left alone.
5. Starts PostgreSQL and Redis with Docker and waits for PostgreSQL to accept connections.
6. Runs database migrations and seeds the default pipeline stages.
7. Creates your first **Super Admin**. It asks for an email, a name and a password. The password is not shown while you type.

You can create another admin, or reset one, at any time with `make admin`. See [Sign-in and users](../administration/authentication).

## Add provider credentials

The setup script cannot create personal provider secrets. Add these values manually after setup if you need their features:

- Cloudflare R2 or another S3-compatible bucket for resumes and attachments
- Resend for transactional email
- Gemini for optional AI CV notes (the app runs without it, and the feature is off until turned on in Settings)
- Google OAuth and Calendar configuration for interview scheduling

To send invite and password reset emails, also put the Resend values in `frontend/.env`. Without them the app still works, and in development the links are printed in the terminal instead.

## Start development

```sh
make dev
```

This starts Docker infrastructure, the backend API and the frontend together. Open the web application at `http://localhost:3000` and sign in with the admin you created during setup.

## Manual fallback

If `make setup` fails or you want to understand each command, continue with the [Manual setup](quick-start) guide. It performs the same workflow one step at a time and is the best place to troubleshoot an individual service.

## Useful commands

| Command | Purpose |
| --- | --- |
| `make infra-up` | Start PostgreSQL and Redis only. |
| `make infra-down` | Stop local infrastructure. |
| `make migrate` | Generate and apply pending database migrations. |
| `make seed` | Seed default pipeline stages. |
| `make admin` | Create a Super Admin, or reset one if you are locked out. |
| `make test` | Run automated tests. |
| `make test-e2e` | Run Playwright end-to-end tests. |
| `make build` | Build frontend and backend packages. |
