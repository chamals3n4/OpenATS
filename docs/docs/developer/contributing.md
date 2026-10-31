---
title: Contributing Guide
sidebar_label: Contributing Guide
description: How to contribute to OpenATS. Pick a task, set up a fork, write a good pull request title, pass CI, and get your change merged.
keywords: [contribute to OpenATS, open source contribution, pull request guide, good first issue]
---

# Contributing Guide

OpenATS is built in the open, and we'd love your help. Bug fixes, tests, docs, accessibility improvements and small features are all welcome. You don't need to write code to contribute: reporting a clear bug or fixing a confusing sentence in these docs helps too.

## Find something to work on

Look through the [open issues](https://github.com/chamals3n4/OpenATS/issues) first, so you don't repeat work someone's already doing. Comment on an issue if you're picking it up.

Small, focused changes are the easiest to review. For anything bigger, open an issue first and describe the problem and your idea. That way we can agree on the approach before you spend time building it.

## Set up your copy

1. Fork the repository on GitHub.
2. Clone your fork, and add the main repository as `upstream`:

   ```bash
   git clone https://github.com/<your-username>/OpenATS.git
   cd OpenATS
   git remote add upstream https://github.com/chamals3n4/OpenATS.git
   ```

3. Follow the [Quick Start](../getting-started/make-setup) to get it running.

You'll need Node.js 22, pnpm, Git, Docker and Make. You don't need an account with any outside service to sign in. For a look at the code, read the [Architecture](./architecture) page and the [Development Guide](./development-guide).

## Start from a fresh branch

Do this before each task. We squash merge, so reusing an old branch causes conflicts.

```bash
git checkout main
git pull upstream main
git push origin main
git checkout -b feature/short-description
```

Use `fix/short-description` for a bug fix.

## Make your change

Keep it small and match the code around it. One pull request should do one thing, so please leave unrelated cleanups for another time.

- **Changed behaviour?** Add or update a test. See the [Testing Guide](./testing).
- **Changed the database?** Commit the generated files in `backend/drizzle/`. See [Change the database](./development-guide#change-the-database).
- **Changed something people use?** Update the docs in the same pull request.

## Check it before you push

```bash
pnpm test
pnpm --filter ./backend lint
pnpm build
```

These are close to what CI runs, so it's quicker to catch problems here.

## Open a pull request

```bash
git add <your files>
git commit -m "fix: resume upload fails on large files"
git push origin feature/short-description
```

Then open a pull request against `main` on GitHub.

### Write a good title

We squash merge, so your whole pull request becomes one commit, and its title becomes that commit's message. It also feeds the release notes. Use this format:

```text
type: short description
```

| Type | Use it for | Example |
| --- | --- | --- |
| `feat` | A new feature | `feat: add bulk candidate import` |
| `fix` | A bug fix | `fix: resume upload fails on large files` |
| `docs` | Documentation only | `docs: update the sign-in guide` |
| `refactor` | A code change with no change in behaviour | `refactor: simplify CV parser` |
| `test` | Adding or fixing tests | `test: add pipeline stage tests` |
| `chore` | Tooling, dependencies, config | `chore: update eslint config` |

For a breaking change, add `!` after the type, like `feat!: change job API response shape`. Your individual commit messages inside the pull request can be anything, since they get squashed.

### Write a helpful description

Tell us what changed, why, and how you tested it. Add screenshots for anything visible, and link the related issue.

## What CI checks

Every pull request runs these automatically:

- backend lint
- type checks for the backend, frontend and browser tests
- unit and integration tests for the backend and frontend
- a backend build
- a check that the sign-in tables match the migrations

CI uses no secrets, so your tests have to pass without real API keys. That's also why tests from forks work. If something fails, open the check's log, fix it, and push to the same branch.

## After you open it

Someone will review your change and may ask for updates. Push them to the same branch, and the pull request updates by itself. Please don't push directly to `main`.

Once it's merged, delete your branch and start the next task from a fresh one:

```bash
git checkout main
git pull upstream main
git branch -D feature/short-description
```

Releases are automated, so please don't edit `CHANGELOG.md` or change version numbers in your pull request.

## Need help?

If you're stuck on setup, see [Troubleshooting](../getting-started/troubleshooting). Otherwise, ask on your issue or pull request, and include the command you ran and the full error.

Please read our [Code of Conduct](https://github.com/chamals3n4/OpenATS/blob/main/CODE_OF_CONDUCT.md) too. Found a security problem? Don't open a public issue. Follow [SECURITY.md](https://github.com/chamals3n4/OpenATS/blob/main/SECURITY.md) instead.
