---
title: Deployment
sidebar_label: Choose How to Deploy
description: The ways to put OpenATS online for your team, what each one involves, and what every option needs.
keywords: [deploy OpenATS, OpenATS hosting, Render, Vercel, self-host ATS]
---

# Deployment

OpenATS is three programs: the **website** (dashboard, careers page and sign-in), the **API**, and a **background worker** that reads CVs. Wherever you put them, they need the same things around them: a PostgreSQL database, Redis, Cloudflare R2 (or another S3-compatible store) for files, and an SMTP provider for email.

Pick the guide that fits you:

| Guide | Good for | You manage |
| --- | --- | --- |
| [Render](./render) | Most teams. Everything on one platform, with HTTPS, deploys and restarts handled for you | Settings only, no server |
| [Frontend on Vercel](./vercel-frontend) | Teams who already use Vercel. Use it together with the Render guide or your own server for the backend | Settings only |
| [Your Own Server](./own-server) | Full control, or the lowest monthly cost once you're comfortable running a server | The server, updates, HTTPS and backups |

Haven't tried OpenATS yet? Run it on your own computer with the [Quick Start](../getting-started/make-setup) first. It's the quickest way to see how the pieces fit together.

Every setting is explained in [Environment Variables](../getting-started/environment-variables).
