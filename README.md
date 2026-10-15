<h1 align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="./frontend/public/assets/openats-readme-white.png">
    <img src="./frontend/public/assets/openats-readme-black.png" alt="OpenATS logo" width="240">
  </picture>
</h1>

<p align="center">
  <strong>An open-source hiring platform to streamline recruitment and hire faster.</strong>
</p>

<p align="center">
  <a href="https://demo.openats.dev"><strong>Live demo</strong></a> ·
  <a href="#features"><strong>Features</strong></a> ·
  <a href="#tech-stack"><strong>Tech stack</strong></a> ·
  <a href="#getting-started"><strong>Getting started</strong></a> ·
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

OpenATS is an open-source applicant tracking system for organizations that want to run hiring in
one clear, shared workspace. It replaces disconnected spreadsheets, inboxes, and point tools with a
process that follows a candidate from an open role through interview and final decision.

## Features

- **Jobs and careers page**: create jobs with departments, salary and custom application
  questions, and publish them on a built-in careers page or embed them on your own website.
- **Candidate pipeline**: move candidates through your own hiring stages on a drag and drop
  board, with filters, bulk actions and a full stage history.
- **CV search**: the text of every uploaded CV is read on your server, so you can search across
  all CVs and see where the words matched.
- **Scoring**: each job sets how much application answers, assessments, ratings and interviews
  count, and every candidate gets a total score from them.
- **Assessments**: build tests with choice and written questions, send them automatically at a
  stage, and grade written answers.
- **Interviews**: schedule interviews, let candidates pick a time from the slots you offer, add
  them to the interviewer's Google Calendar with a Meet link, and collect scorecards.
- **Offers**: write offer letters from templates, send them, and let candidates accept or
  decline online before the offer expires.
- **Emails**: email candidates from templates, and reword the emails OpenATS sends by itself.
- **Team collaboration**: a private discussion for each job's hiring team, star ratings and
  shared notes.
- **Roles and access**: super admins, hiring managers and interviewers, with interviewers seeing
  only the jobs they are on.
- **Optional AI notes**: turn on Gemini to get a summary, strengths and gaps for each CV. It is
  off by default and never part of the score.

## Tech stack

One pnpm workspace with two packages, `frontend` and `backend`, installed from the root.

| | |
| --- | --- |
| **Frontend** | [Next.js](https://nextjs.org) (App Router) · TypeScript · [Tailwind CSS v4](https://tailwindcss.com) · [shadcn/ui](https://ui.shadcn.com) · [hugeicons](https://hugeicons.com) · [React Query](https://tanstack.com/query) |
| **Backend** | [Express 5](https://expressjs.com) · TypeScript · [Socket.IO](https://socket.io) for live updates |
| **Database** | PostgreSQL with [Drizzle ORM](https://orm.drizzle.team) |
| **Background jobs** | [BullMQ](https://docs.bullmq.io) on Redis, run by a required worker process (CV text, file cleanup, optional AI notes) |
| **Sign-in** | Built in with [Better Auth](https://www.better-auth.com): email and password, no outside identity service |
| **Storage** | Cloudflare R2 or any S3-compatible bucket |
| **Email** | [Resend](https://resend.com) |
| **AI (optional)** | [Gemini](https://ai.google.dev) |

### Repository layout

| Path | |
| --- | --- |
| `frontend/` | Next.js app, port 3000. See its [README](./frontend/README.md) |
| `backend/` | Express API and background worker, port 8080 |
| `backend/drizzle/` | Generated database migrations, always committed |
| `e2e/` | Playwright end-to-end tests |
| `docs/` | The documentation site |

## Getting started

You need Node.js 22+, Docker, pnpm (`npm install -g pnpm`), `make` and `openssl`.

```sh
git clone https://github.com/chamals3n4/OpenATS.git && cd OpenATS

make setup   # installs, creates both .env files, starts Postgres and Redis,
             # runs migrations, seeds the pipeline stages, creates your first admin
make dev     # API on :8080, worker, and the app on :3000
```

Open http://localhost:3000 and sign in with the admin you created. Run `make admin` at any time
to add a super admin, or to get back in if you are locked out.

A few values can't be generated for you: fill in `R2_*` and `RESEND_*` in `backend/.env` before
uploading CVs or sending email.

The **background worker is required**. It reads every uploaded CV and removes the files of
deleted candidates; without it, CVs stay "pending". `make dev` starts it with everything else.
To turn on AI notes, set `GEMINI_API_KEY` and enable it in **Settings → General**.

For every step done by hand, see [CONTRIBUTING.md](./CONTRIBUTING.md).

## Configuration

Each package reads its own `.env`, and each `.env.example` explains every value. Both apps stop at
startup with a clear message if a required value is missing.

**`backend/.env`**

| Variable | What it is for |
| --- | --- |
| `DATABASE_URL` | Postgres connection |
| `REDIS_URL` | Redis, for background jobs |
| `AUTH_JWKS_URL` / `AUTH_ISSUER` | Checking sign-in tokens. `AUTH_ISSUER` must equal `BETTER_AUTH_URL` |
| `ENCRYPTION_KEY` | Encrypts stored integration credentials |
| `FRONTEND_URL` | CORS and links in emails |
| `R2_*` | File storage |
| `RESEND_*` | Email |
| `GEMINI_API_KEY` | Optional. AI notes, also off until turned on in Settings |
| `GOOGLE_OAUTH_*` | Optional. Lets interviewers connect Google Calendar and Meet |

**`frontend/.env`**

| Variable | What it is for |
| --- | --- |
| `DATABASE_URL` | The same database as the backend |
| `BETTER_AUTH_SECRET` / `BETTER_AUTH_URL` | Sign-in: a secret of 32+ characters, and the app's public URL |
| `OPENATS_API_URL` / `NEXT_PUBLIC_API_URL` | Where the backend is, from the server and the browser |
| `RESEND_*` | Optional. Invite and password reset emails |

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for the full setup, branching rules and how to open a
pull request.

## Licence

[Apache 2.0](./LICENSE).
