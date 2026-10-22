# OpenATS frontend

The OpenATS web app: the hiring team's dashboard, the public careers page, and the pages candidates
open from their emails (assessments, interview booking, offers). It also handles sign-in, using
Better Auth inside Next.js.

It talks to the Express API in `backend/` for all hiring data. This guide is for developers working
on the frontend. For the whole project, see the [root README](../README.md) and
[CONTRIBUTING.md](../CONTRIBUTING.md).

## Stack

- **Next.js 16** with the App Router, React 19 and TypeScript
- **Tailwind CSS v4**, configured in CSS (there is no `tailwind.config.ts`)
- **shadcn/ui** (`base-vega` style, built on Base UI) with **hugeicons** for icons
- **TanStack React Query** for all server data
- **Better Auth** for sign-in, sessions and user management
- **Socket.IO** client for live updates (team chat, candidate changes)
- **Vitest** and Testing Library for tests

## Getting started

You need Node.js 22+, pnpm, Docker and Make. The repo is a pnpm workspace, so install and run
everything from the **root**, not from this folder.

```bash
make setup   # installs packages, creates .env files, starts Postgres and Redis, migrates, creates your admin
make dev     # starts the backend, the background worker and this app together
```

Then open http://localhost:3000 and sign in with the admin you created.

To work on the frontend on its own (the backend must already be running):

```bash
pnpm --filter ./frontend dev
```

### Environment

`make setup` copies `.env.example` to `.env` and fills in the sign-in values. The ones that matter:

| Variable | What it is for |
|---|---|
| `OPENATS_API_URL` | The Express API, called from the server |
| `NEXT_PUBLIC_API_URL` | The Express API, called from the browser (public pages, sockets) |
| `DATABASE_URL` | The same database as the backend. Better Auth keeps its tables there |
| `BETTER_AUTH_SECRET` | 32+ characters. The app will not start without it |
| `BETTER_AUTH_URL` | This app's public URL. Must equal `AUTH_ISSUER` in `backend/.env` |
| `SMTP_*`, `MAIL_FROM` | Optional. Sends invite and reset password emails, through the same SMTP server as the backend |
| `NEXT_PUBLIC_APP_URL` | Optional. Used in careers page links |

Never put a secret in a `NEXT_PUBLIC_` variable: those are sent to the browser.

## Commands

Run these from the root with `pnpm --filter ./frontend <command>`, or from this folder with `pnpm <command>`.

| Command | What it does |
|---|---|
| `dev` | Dev server on port 3000 |
| `build` | Production build. Also catches type and import errors the dev server can miss |
| `lint` | ESLint |
| `test` / `test:run` | Vitest in watch mode / once |
| `exec tsc --noEmit` | Type-check |
| `exec tsx scripts/create-admin.ts` | Create or reset a super admin (also `make admin` at the root) |

Before opening a pull request, run the type-check, `lint`, `test:run` and `build`.

## How the code is organised

### Routes

Every page lives under `app/`, and the folder path is the URL. Folders in brackets are
**route groups**: they share a layout without appearing in the URL.

- **`(dashboard)`**: everything the hiring team uses after signing in. Its layout checks the
  session, then sets up React Query, the socket token, the sidebar and the header.
- **`(auth)`**: sign in, forgot password and reset password.
- **Public pages**: `careers`, `assessment`, `interview` and `offer`. These are opened by
  candidates. They have no session and call the API's `/public` routes.
- **`api/`**: Next.js route handlers: Better Auth, user management, and small proxies (for example
  downloading a CV with the user's token).

### Where code goes

The rule is **keep code next to the page that uses it, and only share what is really shared**.

- Code used by one page sits beside it in private folders, which Next.js leaves out of routing:
  `_components` for UI, `_lib` for plain helpers and types, `_hooks` for hooks.
- A page never imports from another page's private folders. When a second page needs something,
  move it up to their nearest common parent. For example, the interview scheduler is used by the
  candidate page and the interviews page, so it lives in `(dashboard)/_components`.
- Code used across the app goes in the top-level folders:
  - `components/ui`: shadcn primitives (buttons, dialogs, inputs). Change these carefully, they are
    used everywhere.
  - `components/`: shared app pieces (tables, form controls, layout, guards, providers).
  - `hooks/queries`: React Query hooks, one file per area (jobs, candidates, offers, …).
  - `hooks/`: other shared hooks (`useRole`, sockets, drag and drop).
  - `lib/`: plain code with no React. `lib/auth` is sign-in and sessions, `lib/users` is user
    management, `lib/format.ts` has the shared date, time and salary formats, and
    `lib/server-fetch.ts` calls the API.
- Shared code never imports from `app/`.

### Data

- **Server data goes through React Query**, using the hooks in `hooks/queries`. Do not copy server
  data into `useState` or React context. If you need it in two places, call the hook in both;
  React Query shares the request and the cache.
- **Calling the API**: use `serverFetch` from `lib/server-fetch.ts`. It runs on the server, adds
  the signed-in user's token and calls Express. Public pages use plain `fetch` to `/public/*`
  because there is no user.
- **After a change**, invalidate the query keys that show that data, so every page that uses them
  refreshes. Keep query keys consistent with the existing hooks in the same file.
- **Live updates** come through Socket.IO. `lib/socket.ts` opens the connection with a token from
  `/api/socket-token`, and the hooks write incoming events into the React Query cache, so the
  socket and the normal requests never show different data.

### Sign-in and roles

- `lib/auth/session.ts` (`getSession`, `getApiToken`, `requireRole`) is the only way server code
  reads the session. `proxy.ts` only checks that a session cookie exists. The real check happens
  in the dashboard layout.
- There are three roles: `super_admin`, `hiring_manager` and `interviewer`. In components, use
  `useRole()` (`isManager`, `isSuperAdmin`, `isInterviewer`) and never compare role strings.
- To keep a whole page from a role, wrap it in `RoleGuard` (`allow="manager"` or
  `allow="super_admin"`).
- **The UI only hides things.** The API checks every permission itself, so a hidden button is
  never the only protection.

### Styling

- Use Tailwind classes, with the theme colour through `bg-theme`, `text-theme` or
  `var(--theme-color)`. Every screen must work in both light and dark mode, so give colours a
  `dark:` variant.
- The look is flat: plain sections with dividers, small corner radius, no stacked cards or pastel
  pill badges. Interactive things get `cursor-pointer` and a short hover transition.
- Icons come from hugeicons (`@hugeicons/react` with `@hugeicons/core-free-icons`). Some older
  files still use lucide; don't add new lucide icons.
- Heavy components that only work in the browser (the rich text editor, the AI analysis tab) are
  loaded with `next/dynamic` in the file that uses them.

### Security

- HTML written by users (job descriptions) is cleaned with `cleanRichText` from
  `lib/clean-html.ts` before it goes into the page. Templates and emails are shown in a sandboxed
  iframe. Never render stored HTML any other way.
- Never log or display a secret, a token or a password, and never put them in `NEXT_PUBLIC_`
  variables.

## Conventions

- File names are kebab-case (`job-header.tsx`), and exports are named (except Next.js files such
  as `page.tsx` and `layout.tsx`).
- Keep comments short and plain, and only where the code does not explain itself.
- A form inside a dialog is mounted only while the dialog is open (or keyed by the item being
  edited), so it always starts fresh.
- Dialogs cannot be closed while they are saving.
- Show errors with a toast (`sonner`) and success with a short toast.

## Tests

Tests live in `tests/` and run in jsdom with Vitest and Testing Library.

- Test what a user does and sees: render the component, use the page by its labels and roles,
  and check the result.
- Mock the hooks or API functions a component calls with `vi.mock`, rather than the network.
  When mocking a query hook, return the same object on every call, as React Query does.
- Components that load their own data are usually a small wrapper around a `…View` component that
  takes plain props. Test the view with props, and the wrapper only for its wiring.
- End-to-end tests (Playwright) live in `e2e/` at the root and run with `pnpm test:e2e`. Stop
  `make dev` first.

## Adding a page

1. Create the folder under the right group, for example `app/(dashboard)/reports/page.tsx`.
2. Put its components, helpers and hooks in `_components`, `_lib` and `_hooks` beside it.
3. Add or reuse hooks in `hooks/queries` for its data.
4. If only some roles may use it, wrap it in `RoleGuard`, and make sure the API checks the role too.
5. Add it to the sidebar (`components/layout/app-sidebar.tsx`) if it needs a menu entry.
6. Add tests for what users do on it.

## Troubleshooting

- **The app exits at start** with a missing variable: check `frontend/.env`, especially
  `DATABASE_URL`, `BETTER_AUTH_SECRET` (32+ characters) and `BETTER_AUTH_URL`.
- **Signed in, but every API call fails with 401**: `BETTER_AUTH_URL` here and `AUTH_ISSUER` in
  `backend/.env` must be exactly the same, and the backend must be running.
- **A CV stays "waiting"**: the background worker is not running. `make dev` starts it.
- **Type errors mentioning `.next/types`** after moving pages: delete `.next` or run a build to
  regenerate them.
