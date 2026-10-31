---
title: Architecture
description: How OpenATS is built. The website, API and worker, how a request and a CV move through the system, and how sign-in, data and files are handled.
keywords: [OpenATS architecture, modular monolith, Next.js Express architecture, BullMQ worker, Better Auth]
---

# Architecture

OpenATS is a **modular monolith**: one codebase and one database, with features split into clear modules. That keeps local setup and changes across features simple, while still giving each feature its own home.

## The big picture

```text
Browser
   │
   ▼
Next.js website ──── sign-in ────────────► PostgreSQL
   │                                           ▲
   │ API calls with a short-lived token        │
   ▼                                           │
Express API ───────────────────────────────────┤
   │                                           │
   │ queues jobs on Redis                      │
   ▼                                           │
BullMQ worker ─────────────────────────────────┘
   │
   ▼
File storage, Gemini
```

There are three programs:

- **Next.js website:** the dashboard, the public careers page, and pages candidates open from emails. It also handles sign-in.
- **Express API:** the business rules, data access and live updates.
- **BullMQ worker:** slow background jobs, so they don't hold up web requests. It reads CV text, erases deleted candidates' files, and runs AI analysis if that's on.

The worker isn't a separate service with its own data. It shares the backend's code and database, and picks up jobs the API puts on Redis.

| Layer | Built with |
| --- | --- |
| Website | Next.js, TypeScript, Tailwind CSS v4, shadcn/ui, React Query |
| API | Express 5, TypeScript, Socket.IO |
| Database | PostgreSQL with Drizzle ORM |
| Queues | BullMQ on Redis |
| Sign-in | Better Auth |
| Files | S3-compatible storage, normally Cloudflare R2 |
| Email | Any SMTP server through Nodemailer |

## Project layout

It's a pnpm workspace, with one lockfile at the root.

```text
OpenATS/
├── backend/
│   ├── src/
│   │   ├── modules/       one folder per feature
│   │   ├── routes/        mounts every module, plus /public routes
│   │   ├── shared/        code used by unrelated modules
│   │   ├── middlewares/   auth, rate limits, errors
│   │   ├── queues/        background jobs
│   │   ├── db/            Drizzle schema and scripts
│   │   └── config/        env checks, Redis
│   ├── drizzle/           generated SQL migrations
│   └── tests/
├── frontend/
│   ├── app/               Next.js routes
│   ├── components/        shared UI
│   ├── hooks/queries/     React Query hooks
│   ├── lib/               shared helpers, auth
│   └── tests/
├── e2e/                   Playwright tests
└── docs/                  this site
```

## How a request travels

```text
Browser → Next.js proxy route → Express → route → controller → service → PostgreSQL
```

1. The browser calls `clientFetch`, which goes through `app/api/proxy/[...path]` on the website. That route attaches the sign-in token.
2. The Express API checks the token, then applies rate limits.
3. The module's route checks permissions, then hands over to its controller.
4. The controller deals with the request and response. The service holds the rules and database work.

Server-rendered pages use `serverFetch` instead, which attaches the token the same way.

## How sign-in works

Better Auth runs inside the Next.js server and keeps users and sessions in PostgreSQL. So there's one exception to the website only talking to the API: it connects to the database directly, for sign-in alone.

For each API call, the website issues a 15-minute token. The API checks it against the public keys at `/api/auth/jwks`. The token only says who you are. Your role, and whether you're active, are read from the database on every request, which is why a role change applies immediately.

Both the REST API and Socket.IO check tokens through `shared/auth/verify-token.ts`, so the two can't disagree about who's signed in.

## Who can see what

Being signed in isn't enough. Permissions depend on two things:

- **Your role** decides what you may change.
- **The hiring team** decides which jobs you can see. Super Admins see everything.

The rules live in `shared/auth/job-access.ts`. Any route returning candidate or job data must use one of its guards. Public routes under `/public/*` have no sign-in, so nothing private can go there. Candidates reach their own tests, assignments and offers through private token links.

## What happens to a CV

```text
Candidate uploads a CV
  → API stores the file in the private bucket and creates the candidate
  → API queues a job on Redis
  → the worker reads the text on its own thread, with a 30 second limit
  → the text is saved in PostgreSQL, ready for search
  → if AI analysis is on, a second job sends the CV to Gemini
  → Socket.IO tells open dashboards
```

CV text is read on your own server, with no AI. CV files sit in a private bucket and the database only keeps the file's key. The only way a CV leaves storage is `GET /candidates/:id/resume`, which checks access first and sends the bytes itself.

## Live updates

Socket.IO runs on the same server as the API. A socket needs a valid token to connect, and joining a job's or candidate's chat is checked against the hiring team. Dashboard-wide events go to a `staff` room that every signed-in socket joins.

## Data

PostgreSQL is the source of truth for everything. Redis only holds queue jobs and live events, so you could lose it without losing any hiring data. Schema files live in `backend/src/db/schema/`, one for each area.

## Keep reading

- [Development Guide](./development-guide) for how to work in this code.
- [Testing Guide](./testing) for what to test and how.
