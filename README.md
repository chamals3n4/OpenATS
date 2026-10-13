<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="./frontend/public/assets/openats-logo-white.png">
    <img src="./frontend/public/assets/openats-logo.png" alt="OpenATS logo" width="80">
  </picture>
</p>

<h1 align="center">OpenATS</h1>

<p align="center">
  <strong>An open-source hiring platform to streamline recruitment and hire faster.</strong>
</p>

<p align="center">
  <a href="https://demo.openats.dev"><strong>Live demo</strong></a> ·
  <a href="#key-features"><strong>Features</strong></a> ·
  <a href="#the-stack"><strong>Stack</strong></a> ·
  <a href="#quick-start"><strong>Quick start</strong></a> ·
  <a href="#configuration"><strong>Configuration</strong></a> ·
  <a href="./CONTRIBUTING.md"><strong>Contributing</strong></a>
</p>

<p align="center">
  <img alt="Apache 2.0 licence" src="https://img.shields.io/badge/licence-Apache%202.0-blue.svg">
  <img alt="Next.js" src="https://img.shields.io/badge/frontend-Next.js-black.svg">
  <img alt="Express" src="https://img.shields.io/badge/backend-Express%205-black.svg">
  <img alt="Postgres" src="https://img.shields.io/badge/database-Postgres-336791.svg">
</p>

---

## What this is

Recruiting often means juggling spreadsheets, inboxes, and a handful of disconnected
tools. OpenATS brings job creation, candidate tracking, interviews, and hiring
decisions into one workspace teams can set up as their own internal hiring platform.

Many recruitment tools are hard to customize and expensive to scale. OpenATS is a
flexible open-source alternative: use it as a ready-to-go hiring platform, or as the
foundation for building your own internal recruitment system - with full ownership of
the code, the data, and the workflow, instead of adapting your process to fit someone
else's software.

OpenATS provides:

- Full ownership through open-source software
- Flexible and customizable hiring workflows
- A foundation for building internal recruitment platforms
- Reduced dependence on proprietary ATS vendors
- Improved collaboration across hiring teams

## Everything you need to hire better

From job creation to candidate evaluation and hiring decisions, OpenATS provides the
tools your team needs to build a faster, more organized recruitment process.

**Job Management**
Create, organize, and manage job openings with structured requirements, departments,
and hiring workflows.

**Candidate Tracking**
Track applicants through every stage of the hiring process with a clear and
customizable recruitment pipeline.

**Interview Management**
Schedule interviews, collect feedback, and keep everyone aligned throughout the
candidate evaluation process.

**AI Resume Parsing**
Automatically extract and organize candidate information from resumes to save time
and reduce manual work - run as a background job so a slow AI call never blocks a
candidate-facing page.

**Team Collaboration**
Collaborate on hiring decisions with shared feedback, candidate reviews, and
streamlined communication.

**Career Page Builder**
Build a career page that showcases opportunities and attracts the right candidates to
your organization.

## The stack

Two independent packages - not a monorepo, no shared `package.json` or lockfile.

|                     |                                                                                                                                                                                              |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Frontend**        | [Next.js](https://nextjs.org) (App Router) · TypeScript · [Tailwind CSS v4](https://tailwindcss.com) · [shadcn/ui](https://ui.shadcn.com) (`base-vega`) · [hugeicons](https://hugeicons.com) |
| **Backend**         | [Express 5](https://expressjs.com) · TypeScript (compiled to CommonJS) · [Socket.IO](https://socket.io) for realtime updates                                                                 |
| **Data**            | [Drizzle ORM](https://orm.drizzle.team) · PostgreSQL ([Neon](https://neon.tech) in production, any Postgres locally)                                                                         |
| **Jobs**            | [BullMQ](https://docs.bullmq.io) on Redis - a required background worker process reads CV text and erases deleted candidates' files, and runs the optional AI CV analysis |
| **AI**              | Optional: [Gemini](https://ai.google.dev) writes notes on CVs (a summary, strengths and gaps). Off by default, and never part of the candidate score |
| **Auth**            | Built in, with [Better Auth](https://www.better-auth.com): email and password, no outside identity service. Roles are `super_admin` / `hiring_manager` / `interviewer` |
| **Storage**         | Cloudflare R2 (or any S3-compatible bucket) for resumes and attachments                                                                                                                      |
| **Email**           | [Resend](https://resend.com) for candidate and team notifications                                                                                                                            |
| **Package manager** | pnpm, as one workspace installed from the repository root |

### Layout

| Path                             |                                                                                                                            |
| -------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `frontend/`                      | Next.js app · :3000                                                                                                        |
| `backend/`                       | Express API · :8080                                                                                                        |
| `backend/src/queues`             | The BullMQ queues run by the background worker: CV text, CV file deletion, and AI CV analysis |
| `backend/src/db/schema`          | Drizzle schema, one file per domain                                                                                        |
| `backend/drizzle`                | Generated migration SQL - always committed, never hand-edited                                                              |
| `e2e/`                           | Playwright end-to-end tests, at the root because they span both packages                                                   |
| `docs/`                          | The documentation site: [sign-in and users](./docs/docs/administration/authentication.md), [testing guide](./docs/docs/developer/testing.md) |

## Quick start

You need Node.js 22+, Docker, pnpm (`npm install -g pnpm`), `make` and `openssl`.

```sh
git clone https://github.com/chamals3n4/OpenATS.git && cd OpenATS

make setup      # installs, creates both .env files, starts Postgres and Redis,
                # runs migrations, seeds the pipeline stages, creates your first admin
make dev        # API on :8080, app on :3000
```

Open `http://localhost:3000` and sign in with the admin you created during `make setup`.
Sign-in is built in, so there is no outside account to create. Run `make admin` at any
time to add a super admin or to get back in if you are locked out.

`make setup` leaves a few provider values blank, because nobody can generate them for
you: `R2_*` and `RESEND_*` in `backend/.env`. Fill those in before uploading CVs or
sending email.

The **background worker is required**, not optional. It reads the text of every uploaded CV
(which is what CV search looks through) and erases the files of deleted candidates. Without
it CVs stay "pending" and never appear in search. `pnpm dev` and `make dev` start it together with the API and the web app; to run it by
itself:

```sh
pnpm --filter ./backend dev:worker
```

AI CV analysis is optional and runs in the same worker. To use it, set `GEMINI_API_KEY` and
turn it on under **Settings → General**.

Prefer to run each step by hand? The full walkthrough is in
[CONTRIBUTING.md](./CONTRIBUTING.md).

## Configuration

Each package reads its own `.env` - there's no shared root env file.

**`backend/.env`**

| Variable                                             | What it's for                                                   |
| ---------------------------------------------------- | --------------------------------------------------------------- |
| `DATABASE_URL`                                       | Postgres connection string                                      |
| `REDIS_URL`                                          | Redis, for the CV analysis job queue                            |
| `AUTH_JWKS_URL` / `AUTH_ISSUER`                      | Where the API checks sign-in tokens. `AUTH_ISSUER` must equal `BETTER_AUTH_URL` |
| `ENCRYPTION_KEY`                                     | Encrypts stored integration credentials                         |
| `FRONTEND_URL`                                       | Used for CORS and links in outbound emails                      |
| `R2_*`                                               | Cloudflare R2 (or compatible) object storage for uploaded files |
| `RESEND_*`                                           | Transactional email                                             |
| `GEMINI_API_KEY`                                     | Optional - AI CV analysis, which is also off until turned on in Settings |
| `GOOGLE_OAUTH_*`                                     | Optional - lets interviewers connect Google for calendar events and Meet links |

**`frontend/.env`**

| Variable                                  | What it's for                                                  |
| ----------------------------------------- | -------------------------------------------------------------- |
| `DATABASE_URL`                            | The same database as the backend. Sign-in keeps its tables there |
| `BETTER_AUTH_SECRET` / `BETTER_AUTH_URL`  | Sign-in: a secret of 32+ characters, and the public URL of the app |
| `RESEND_*`                                | Optional - sends invite and password reset emails               |
| `OPENATS_API_URL` / `NEXT_PUBLIC_API_URL` | Where the backend is reachable from the server and the browser |

Both apps fail fast at startup, with a clear message, if a required variable is missing,
rather than crashing later on the first request that needs it. Each `.env.example`
says what every value is for.

## Deploying

TODO

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for the full setup walkthrough, branching
rules, and how to open a pull request.

## Licence

[Apache 2.0](./LICENSE).
