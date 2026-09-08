---
title: Contributing Guide
sidebar_label: Contributing Guide
---

OpenATS is built in the open. Contributions that improve the product, documentation, tests, accessibility, or developer experience are welcome.

## Before you begin

Set up a working local copy before choosing a task. Follow the [Quick Start](../getting-started/make-setup) guide for the recommended setup, or use [Manual setup](../getting-started/quick-start) if you need to run each step yourself.

OpenATS uses WSO2 Identity Platform for authentication. The [WSO2 Identity Platform setup guide](../administration/iam-setup) explains how to create the required applications, roles, and API permissions.

You will need Node.js 22 or later, pnpm, Git, Docker, and Make. After setup is complete, start the local application from the repository root:

```bash
make dev
```

The frontend is available at `http://localhost:3000` and the API is available at `http://localhost:8080`.

## Choose a contribution

Before starting, look for an existing issue or discussion so work is not duplicated. A good contribution is focused and easy to review. That can be a bug fix, a test, a documentation correction, an accessibility improvement, or a small, well-defined feature.

For a larger change, open an issue first and describe the problem, proposed approach, and any user-facing impact.

## Create a branch

If you do not have write access, fork the repository and clone your fork. Add the main repository as `upstream`:

```bash
git remote add upstream https://github.com/chamals3n4/OpenATS.git
```

Before each task, bring your local main branch up to date:

```bash
git checkout main
git pull upstream main
git push origin main
```

Create one branch for one focused change:

```bash
git checkout -b feature/short-description
# or
git checkout -b fix/short-description
```

## Make and verify your change

Keep the change small, readable, and consistent with the surrounding code. Add or update tests when behavior changes. If you change a database schema, generate the migration and include the generated migration files in the same pull request:

```bash
make migrate
```

Run the relevant checks before pushing:

```bash
pnpm test
pnpm build
```

For the test databases, test types, and guidance on writing tests, see the [Testing guide](testing).

## Open a pull request

Commit with a short, descriptive message and push the branch:

```bash
git add .
git commit -m "Describe the change"
git push origin feature/short-description
```

Open a pull request against `main`. Explain what changed, why it changed, how you tested it, and include screenshots for visible frontend changes. Link the related issue when there is one.

Do not push directly to `main`. Keep commits focused, respond to review feedback, and update the pull request if the target branch changes while it is under review.

## Need help?

If local setup fails, start with the [Manual setup](../getting-started/quick-start) guide. If the issue involves authentication or tenant configuration, use the [WSO2 Identity Platform setup guide](../administration/iam-setup). Include the command you ran and the full error output when asking for help.
