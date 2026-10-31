---
title: Development Guide
description: How to work in the OpenATS codebase. Daily commands, adding an API feature, changing the database, writing frontend pages, and rules to follow.
keywords: [OpenATS development, contribute to open source ATS, Drizzle migrations, Express modules, Next.js app router]
---

# Development Guide

This is what you need to know to change OpenATS code without tripping over its rules. Get it running first with the [Quick Start](../getting-started/make-setup), and have a quick read of the [Architecture](./architecture) page.

## Daily commands

```sh
make dev              # start everything
pnpm test             # run backend and frontend tests
pnpm lint             # lint both packages
pnpm build            # build both packages
```

To work on one side, or run a single test file:

```sh
pnpm dev:backend
pnpm dev:frontend
pnpm --filter ./backend exec vitest run tests/unit/object.util.test.ts
```

The website runs on port 3000 and the API on 8080. Open http://localhost:8025 to see emails.

## Add a backend feature

Code is grouped by feature, not by layer. There's no top-level `controllers/` or `services/` folder.

1. Create `backend/src/modules/<feature>/` with `<feature>.routes.ts`, `<feature>.controller.ts` and `<feature>.service.ts`.
2. Mount the router in `backend/src/routes/index.ts`.
3. Add a permission guard to every route. Being signed in isn't enough.

```ts
router.get("/:id", requireCandidateView("id"), getCandidate);
router.patch("/:id", requireManager, requireCandidateView("id"), updateCandidate);
```

The role decides what someone may change, and the hiring team decides on which jobs. So a manager-only route about a job or candidate needs both guards.

4. Write tests. See the [Testing Guide](./testing).

### When to share code

Importing from another module is fine. Only move code into `shared/` once two unrelated modules need it, not because they might one day.

### Rules worth remembering

- **Imports are plain relative paths.** There's no `@/` alias in the backend, because it wouldn't work once compiled to CommonJS.
- **Don't send `error.message` to users.** Use `safeErrorMessage(error, fallback)`, because a database error can contain the query and its values. Log the real error.
- **Don't log candidate names or emails.** Only log ids, because logs outlive a deletion.
- **Send email after the database change commits,** never inside a transaction. Candidate emails go through `sendCandidateEmail`.
- **Nothing private goes under `/public/*`.** The allowed-websites check isn't access control.
- **Stored HTML must be cleaned** before it reaches a page. See how job descriptions are handled.
- **Anything that deletes candidates must also erase their CV files,** by calling `requestResumeDeletion` after the delete commits.
- **Dates in emails use the company's time zone,** through `formatEmailDate` and `formatEmailTime`.

## Change the database

1. Edit the schema in `backend/src/db/schema/`.
2. Generate the migration, then apply it:

   ```sh
   cd backend
   pnpm drizzle-kit generate
   pnpm drizzle-kit migrate
   ```

3. Read the generated SQL, and commit the files in `backend/drizzle/` with your change.

Never edit a migration that's already been merged. Add a new one. Some rules can't be written in the Drizzle schema, such as the constraint that stops an interviewer being double-booked, so those live in migrations by hand.

Changed how scores or CV details are worked out? Existing records need updating too:

```sh
pnpm tsx src/db/backfill-scores.ts           # after changing score rules
pnpm tsx src/db/backfill-cv-text.ts --reparse   # after changing CV detail rules
```

## Add background work

Queues live in `backend/src/queues/<name>/`. Give each queue and worker its own Redis connection from `config/redis.ts`, and start the worker from `queues/start-workers.ts`. Remember that the worker is a separate process, so it can't share memory with the API.

## Add a frontend page

Pages live in `frontend/app/`. Keep code close to where it's used:

- Code for one route goes beside it in `_components/`, `_lib/` or `_hooks/`. The underscore keeps those folders out of routing, and every private folder inside `app/` needs one.
- A route never imports from another route's private folders. When a second route needs something, move it to their nearest shared parent.
- Code used across the app goes in `frontend/components/`, `lib/` or `hooks/`. These never import from `app/`.
- File names are kebab-case, and exports are named.

```text
app/(dashboard)/jobs/[id]/
├── page.tsx
├── _components/
│   └── job-header.tsx
└── _lib/
```

### Fetch data

- **In the browser:** use `clientFetch` with a React Query hook in `frontend/hooks/queries/`.
- **On the server:** use `serverFetch`.

Share server data through React Query, not React context.

### Roles in the UI

Use `useRole()` rather than comparing role strings, and guard a whole page with `<RoleGuard>`. This only hides things, so the API must still enforce the rule.

```tsx
const { isManager } = useRole();
```

### UI conventions

- Tailwind v4 is configured in CSS, so there's no `tailwind.config.ts`.
- Components come from shadcn/ui, and icons from **Hugeicons**.
- Add `<UnsavedChangesGuard when={isDirty} />` to long forms.
- A new public file at the root, such as `robots.txt`, must be added to `PUBLIC_PATHS` in `proxy.ts`, or it redirects to sign-in.

This version of Next.js has changes from older ones. If something doesn't match what you remember, check `node_modules/next/dist/docs/`.

## Change the docs

The docs are a Docusaurus site in `docs/`, and they're part of the same pnpm workspace, so the install at the root covers them.

```sh
cd docs
pnpm start        # http://localhost:3001
pnpm build        # also checks for broken links
```

Sidebars are set in `docs/sidebars.ts`. If you change how the product behaves, update the guide in the same pull request.

## Next step

Before you push, read the [Testing Guide](./testing) and the [Contributing Guide](./contributing).
