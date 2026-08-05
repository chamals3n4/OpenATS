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
| **Jobs**            | [BullMQ](https://docs.bullmq.io) on Redis - CV analysis runs as its own worker process, not inline with the API                                                                              |
| **AI**              | [Gemini](https://ai.google.dev) for resume parsing, scoring and candidate summaries                                                                                                          |
| **Auth**            | [WSO2 Asgardeo](https://wso2.com/asgardeo) - JWKS-verified, role claims mapped to `super_admin` / `hiring_manager` / `interviewer`                                                           |
| **Storage**         | Cloudflare R2 (or any S3-compatible bucket) for resumes and attachments                                                                                                                      |
| **Email**           | [Resend](https://resend.com) for candidate and team notifications                                                                                                                            |
| **Package manager** | pnpm, installed independently per package                                                                                                                                                    |

### Layout

| Path                             |                                                                               |
| -------------------------------- | ----------------------------------------------------------------------------- |
| `frontend/`                      | Next.js app · :3000                                                           |
| `backend/`                       | Express API · :8080                                                           |
| `backend/src/queues/cv-analysis` | The BullMQ queue, worker, and event bridge for background CV scoring          |
| `backend/src/db/schema`          | Drizzle schema, one file per domain                                           |
| `backend/drizzle`                | Generated migration SQL - always committed, never hand-edited                 |
| `e2e/`                           | Playwright end-to-end tests, at the root because they span both packages      |
| `docs/`                          | [IAM setup](./docs/IAM_SETUP.md), [testing guide](./docs/TESTING.md), [road to GA](./docs/GA_ROADMAP.md) |

## Quick start

You need Node.js 22+, Docker, and pnpm (`npm install -g pnpm`).

```sh
git clone https://github.com/chamals3n4/OpenATS.git && cd OpenATS

cd backend
docker compose up -d          # Postgres on :5432, Redis on :6379
cp .env.example .env          # fill in ASGARDEO_*, R2_*, RESEND_*, GEMINI_API_KEY
pnpm install
pnpm drizzle-kit generate && pnpm drizzle-kit migrate
pnpm tsx src/db/seed.ts       # required: seeds the 5 default pipeline stages
pnpm dev                      # API on :8080
```

In a second terminal, the CV analysis worker (its own process, separate from the API):

```sh
cd backend
pnpm dev:worker
```

In a third terminal:

```sh
cd frontend
cp .env.example .env          # fill in NEXT_PUBLIC_ASGARDEO_*, OPENATS_API_URL
pnpm install
pnpm dev                      # app on :3000
```

Full walkthrough, including how to set up your own Asgardeo application, is in
[CONTRIBUTING.md](./CONTRIBUTING.md).

## Configuration

Each package reads its own `.env` - there's no shared root env file.

**`backend/.env`**

| Variable                                             | What it's for                                                   |
| ---------------------------------------------------- | --------------------------------------------------------------- |
| `DATABASE_URL`                                       | Postgres connection string                                      |
| `REDIS_URL`                                          | Redis, for the CV analysis job queue                            |
| `ASGARDEO_JWKS_URL` / `ASGARDEO_ISSUER`              | JWT verification - required for almost every route              |
| `ENCRYPTION_KEY`                                     | Encrypts stored integration credentials                         |
| `FRONTEND_URL`                                       | Used for CORS and links in outbound emails                      |
| `R2_*`                                               | Cloudflare R2 (or compatible) object storage for uploaded files |
| `RESEND_*`                                           | Transactional email                                             |
| `GEMINI_API_KEY`                                     | Powers CV parsing, scoring, and AI summaries                    |
| `GOOGLE_SERVICE_ACCOUNT_JSON` / `GOOGLE_CALENDAR_ID` | Optional - interview scheduling via a Google service account    |

**`frontend/.env`**

| Variable                                  | What it's for                                                  |
| ----------------------------------------- | -------------------------------------------------------------- |
| `NEXT_PUBLIC_ASGARDEO_*` / `ASGARDEO_*`   | Sign-in against the same Asgardeo application as the backend   |
| `OPENATS_API_URL` / `NEXT_PUBLIC_API_URL` | Where the backend is reachable from the server and the browser |

Startup fails fast with a clear message if a required backend variable is missing,
rather than crashing later on the first request that needs it.

## Deploying

TODO

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for the full setup walkthrough, branching
rules, and how to open a pull request.

## Licence

[Apache 2.0](./LICENSE).
