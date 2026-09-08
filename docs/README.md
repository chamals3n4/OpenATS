# OpenATS Website and Documentation

This directory contains the public OpenATS website and product documentation, built with [Docusaurus](https://docusaurus.io/).

## Install dependencies

From this directory, install the documentation site dependencies:

```bash
pnpm install
```

## Run locally

Start the development server:

```bash
pnpm start
```

The site opens at [http://localhost:3001](http://localhost:3001). Port 3001 keeps the documentation site separate from the OpenATS frontend, which uses port 3000. Changes are reflected automatically while the server is running.

## Build the site

Generate the production files:

```bash
pnpm build
```

The output is written to `build/` and includes the static website, sitemap, robots file, and AI-readable documentation indexes.

Preview the production build locally:

```bash
pnpm serve
```

The preview server also uses port 3001.

## Write documentation

- Product and setup documentation lives in `docs/`.
- Navigation is defined in `sidebars.ts`.
- Landing-page code lives in `src/pages/index.tsx`.
- Landing-page styles live in `src/pages/index.module.css`.
- Global documentation styles live in `src/css/custom.css`.
- Public assets such as the favicon, logos, robots file, and `llms.txt` live in `static/`.

Run the type check before opening a pull request:

```bash
pnpm typecheck
```

## Deployment

Build the site first, then deploy the generated `build/` directory using the hosting provider configured for OpenATS. For GitHub Pages deployment through Docusaurus:

```bash
GIT_USER=<Your GitHub username> pnpm deploy
```

Use `USE_SSH=true` when the GitHub remote should use SSH:

```bash
USE_SSH=true GIT_USER=<Your GitHub username> pnpm deploy
```
