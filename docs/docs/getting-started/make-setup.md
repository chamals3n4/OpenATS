---
sidebar_position: 1
title: Quick Start
---

`make setup` is the recommended first-time setup command. Run it from the repository root. It automates the repeatable local setup steps, then tells you exactly which provider secrets still need to be added.

## What you need first

- Node.js 22 or later
- pnpm
- Docker and Docker Compose
- `make`, `curl`, `jq`, and `openssl`
- A free WSO2 Identity Platform tenant at [console.asgardeo.io](https://console.asgardeo.io)

## Create the Asgardeo management application

Before running Make, create a machine-to-machine application that gives the setup script permission to create and configure the OpenATS sign-in application.

1. In the WSO2 console, open **Applications** and select **New Application**.
2. Choose **M2M Application** and create it in your root organization.
3. Open its **API Authorization** tab and authorize these APIs:
   - Application Management API
   - API Resource Management API
   - Role Management API v2
   - SCIM2 Users API
   - Claim Metadata Management API (optional, but recommended)
4. Copy the M2M application's Client ID and Client Secret. The setup script asks for both values and your organization name, which is the part after `/t/` in the console URL.

The M2M application is only for tenant setup. `make setup` uses it to create the separate **OpenATS** Next.js application that users will actually sign in to.

## Run setup

```sh
make setup
```

The command does the following, in order:

1. Installs dependencies for backend and frontend from the root with pnpm workspaces.
2. Copies `backend/.env.example` and `frontend/.env.example` to real `.env` files when they do not already exist.
3. Generates a random `ENCRYPTION_KEY` if it is blank.
4. Starts PostgreSQL and Redis with Docker and waits for PostgreSQL to accept connections.
5. Runs the interactive Asgardeo tenant setup. It creates or reuses the OpenATS Next.js application, configures claims, roles, sign-in settings, and prints the values for `frontend/.env` and `backend/.env`.
6. Runs database migrations and seeds the default pipeline stages.

You can run the Asgardeo step again at any time with `make asgardeo`.

## Add provider credentials

The setup script cannot create personal provider secrets. Add these values manually after setup if you need their features:

- Cloudflare R2 or another S3-compatible bucket for resumes and attachments
- Resend for transactional email
- Gemini for resume parsing, scoring, and summaries
- Google OAuth and Calendar configuration for interview scheduling

The Asgardeo script prints the values it configured and leaves `NEXT_PUBLIC_ASGARDEO_SIGN_IN_URL` empty when it cannot infer it. Check the printed output and fill every remaining blank value in the matching `.env` file.

## Start development

```sh
make dev
```

This starts Docker infrastructure, the backend API, frontend, and the CV analysis worker together. Open the web application at `http://localhost:3000`.

## Manual fallback

If `make setup` fails or you want to understand each command, continue with the [Manual setup](quick-start) guide. It performs the same workflow one step at a time and is the best place to troubleshoot an individual service.

## Useful commands

| Command | Purpose |
| --- | --- |
| `make infra-up` | Start PostgreSQL and Redis only. |
| `make infra-down` | Stop local infrastructure. |
| `make migrate` | Generate and apply pending database migrations. |
| `make seed` | Seed default pipeline stages. |
| `make test` | Run automated tests. |
| `make test-e2e` | Run Playwright end-to-end tests. |
| `make build` | Build frontend and backend packages. |
