---
sidebar_position: 1
title: Architecture
---

## Architecture style

OpenATS is a **modular monolith**. The backend is one Express application and one codebase, with features organised into independent modules. This keeps development, local setup, and cross-feature changes straightforward while preserving clear boundaries as the product grows.

The application has three runtime parts:

- **Next.js frontend** for the dashboard, career pages, and user-facing flows.
- **Express API** for authentication, business rules, database access, and real-time updates.
- **BullMQ worker** for slow background work, currently CV analysis.

The API and worker run as separate processes, but they belong to the same modular-monolith system. The worker is not a separate service with its own business domain or database. It consumes work placed on Redis queues by the API, so a slow AI request does not block a normal web request.

## How a request moves through OpenATS

```text
Browser
  → Next.js frontend
  → Express API
  → route → controller → service → PostgreSQL
  → response to the frontend
```

The API is mounted under `/api`. Before a protected request reaches a feature module, shared middleware verifies the user, applies rate limits, and handles common errors. A feature route sends the request to its controller; the controller coordinates input and output; and the service contains the application rules and data access.

For resume analysis, the flow is asynchronous:

```text
Candidate resume uploaded
  → API stores the file and creates a queue job in Redis
  → BullMQ worker runs the analysis
  → worker saves the result in PostgreSQL
  → Socket.IO publishes the status update to connected users
```

## Backend modules

Each business area lives under `backend/src/modules/<feature>`. A module keeps related routes, controllers, and services together. Examples include `candidate`, `job`, `interview`, `assessment`, `offer`, `pipeline`, and `hiring-team`.

This is the main modular-monolith boundary: a feature owns its HTTP endpoints and business logic, while shared capabilities stay outside individual modules:

- `db/` contains the Drizzle database setup and schema.
- `middlewares/` contains application-wide HTTP middleware.
- `queues/` contains BullMQ queue and worker code.
- `shared/` contains code intentionally reused by more than one feature, such as authentication, integrations, and Socket.IO services.
- `config/` contains validated environment and infrastructure configuration.

Do not create a new shared utility simply because it might be useful later. Keep code in its feature module until more than one module genuinely needs it.

## Data and integrations

PostgreSQL is the system of record for OpenATS data. Redis supports BullMQ queues and real-time worker events; it is not the source of truth for candidates or hiring decisions. Resume files and attachments are stored through the configured S3-compatible storage integration. WSO2 Identity Platform provides authentication and role claims.

The frontend never connects directly to PostgreSQL or Redis. It communicates with the API, and the API owns access to infrastructure and external providers.

## Frontend structure

The frontend uses Next.js App Router, TypeScript, Tailwind CSS, shadcn/ui, and React Query. Route-specific components remain close to the relevant route in `frontend/app/`. Reusable interface pieces live in `frontend/components/`, and shared client utilities live in `frontend/lib/` and `frontend/hooks/`.

## Testing the boundaries

Unit tests cover isolated logic. Integration tests exercise API routes and the database. End-to-end tests use the frontend and API together against the isolated test database. Read the full [Testing guide](testing) before adding or changing tests.
