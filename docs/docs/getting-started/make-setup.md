---
title: Quick Start
description: Install OpenATS on your own computer with one command. What you need first, what make setup does, and how to get to the sign-in page.
keywords: [install OpenATS, self-hosted ATS setup, open source applicant tracking system install, make setup]
---

# Quick Start

This is the fastest way to get OpenATS running on your own computer. One command does most of the work, and you'll need to add your storage details by hand. Allow about 15 minutes.

Want to put OpenATS on a server for your team? Do this first so you know how it fits together, then follow [Deploy to Production](./deployment).

## Before you start

Install these, then check each one from a terminal:

| You need | Check it with | Notes |
| --- | --- | --- |
| Node.js 22 | `node --version` | The repo's `.nvmrc` pins the exact version, so `nvm use` picks it for you |
| pnpm | `pnpm --version` | `corepack enable` sets up the right version |
| Docker with Compose | `docker compose version` | Runs PostgreSQL, Redis and a test mailbox. Make sure Docker is running |
| Git, `make`, `openssl` | `make --version` | Already installed on most Mac and Linux machines. On Windows, use WSL |

You'll also need ports `3000`, `8080`, `5432`, `6379`, `1025` and `8025` free. If you already run PostgreSQL or Redis on your machine, stop them first.

You don't need an account with any sign-in service. Sign-in is built into OpenATS.

## 1. Download OpenATS

```sh
git clone https://github.com/chamals3n4/OpenATS.git
cd OpenATS
```

## 2. Run the setup command

```sh
make setup
```

Here's what it does, in order:

1. Installs everything for the backend and frontend.
2. Creates `backend/.env` and `frontend/.env` from the example files. If you already have them, they're left alone.
3. Generates `ENCRYPTION_KEY` and `BETTER_AUTH_SECRET`, and fills in the sign-in settings.
4. Starts PostgreSQL, Redis and Mailpit in Docker, and waits until the database is ready.
5. Creates the database tables and adds the default pipeline stages.
6. Asks you for an email, name and password, and creates your first **Super Admin**. Your password won't show as you type.

It's safe to run again if something goes wrong partway through.

## 3. Add your file storage details

:::caution[The backend won't start without this]
OpenATS needs somewhere to keep CVs and logos, and the backend refuses to start while any `R2_` value in `backend/.env` is empty. `make setup` can't fill these in for you.
:::

**If you want uploads to work,** create two Cloudflare R2 buckets and copy the details into `backend/.env`. [Manual Setup](./quick-start#6-set-up-file-storage) walks you through it, and it takes about five minutes.

**If you're just having a look,** fill them in with placeholders for now. The app will start, but uploading a CV or a logo will fail until you add real values.

```ini
R2_ENDPOINT=http://localhost:9000
R2_ACCESS_KEY_ID=placeholder
R2_SECRET_ACCESS_KEY=placeholder
R2_BUCKET_NAME=placeholder
R2_PUBLIC_URL=http://localhost:9000
R2_PRIVATE_BUCKET_NAME=placeholder
```

## 4. Start OpenATS

```sh
make dev
```

This starts three things together: the backend API, the background worker and the website. Leave this terminal open. To stop everything, press `Ctrl+C`.

| Open this | To get to |
| --- | --- |
| http://localhost:3000 | OpenATS |
| http://localhost:3000/careers | Your public careers page |
| http://localhost:8025 | Mailpit, where you can read every email OpenATS sends |
| http://localhost:8080/health | A quick check that the backend is healthy |

## 5. Sign in

Go to http://localhost:3000 and sign in with the admin you created in step 2. OpenATS will take you to your company settings first. Follow [Set Up Your Company](../using-openats/first-login-and-company-setup) from there.

## Emails while you're testing

You don't need an email account. Everything OpenATS sends lands in Mailpit at http://localhost:8025 and never reaches a real inbox, so you can use made-up candidates safely. To send real email, see [Manual Setup](./quick-start#7-set-up-email).

## Useful commands

Run these from the main OpenATS folder.

| Command | What it does |
| --- | --- |
| `make dev` | Starts everything |
| `make infra-up` | Starts only PostgreSQL, Redis and Mailpit |
| `make infra-down` | Stops them. Your data is kept |
| `make migrate` | Updates the database after a code change |
| `make seed` | Puts the default pipeline stages back |
| `make admin` | Creates a Super Admin, or resets one if you're locked out |
| `make test` | Runs the unit and integration tests |
| `make test-e2e` | Runs the browser tests |
| `make build` | Builds the backend and website |
| `make clean` | Deletes all installed packages |

## If something goes wrong

Start with [Troubleshooting](./troubleshooting). If you want to see each step on its own, [Manual Setup](./quick-start) does the same thing by hand.
