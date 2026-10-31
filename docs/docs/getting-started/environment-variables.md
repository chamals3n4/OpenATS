---
title: Environment Variables
description: Every OpenATS setting in backend/.env and frontend/.env, what each one does, which are required, and what to change for production.
keywords: [OpenATS configuration, environment variables, env file, self-hosted ATS configuration]
---

# Environment Variables

OpenATS keeps its settings in two files: `backend/.env` and `frontend/.env`. Each has an example file beside it that you can copy.

Both programs check their settings when they start. If something required is missing, they stop and tell you which value to fix, so you'll know right away.

**After changing a setting, restart the program that uses it.** Anything starting with `NEXT_PUBLIC_` is different: it's built into the website, so you'll need to run the build again as well.

## Backend settings

These go in `backend/.env`, and both the API and the worker read them.

### Core

| Variable | Required | What it's for |
| --- | --- | --- |
| `DATABASE_URL` | Yes | Your PostgreSQL connection |
| `REDIS_URL` | No | Your Redis connection. Defaults to `redis://localhost:6379` |
| `FRONTEND_URL` | Yes | The address people use to open OpenATS. Every link in a candidate email starts with this, so in production it must be your public address |
| `PORT` | No | The API's port. Defaults to `8080` |
| `TRUST_PROXY` | No | How many proxies sit in front of the API. Defaults to `1`. See [Deploy to Production](./deployment#tell-the-api-about-your-proxy) |
| `RUN_WORKER_IN_API` | No | Set to `true` to run the background worker inside the API, for hosting without a second service |

### Sign-in

| Variable | Required | What it's for |
| --- | --- | --- |
| `AUTH_JWKS_URL` | Yes | The website's address followed by `/api/auth/jwks` |
| `AUTH_ISSUER` | Yes | The website's address. Must exactly match `BETTER_AUTH_URL` in the frontend |
| `ENCRYPTION_KEY` | Yes | Protects saved Google connections. Must be 32 bytes in base64. Create one with `openssl rand -base64 32` |

Don't change `ENCRYPTION_KEY` once people have connected their Google accounts, because their saved connections can no longer be read.

### File storage

All of these are required, and the backend won't start while any are empty.

| Variable | What it's for |
| --- | --- |
| `R2_ENDPOINT` | Your storage address |
| `R2_ACCESS_KEY_ID` | The storage access key |
| `R2_SECRET_ACCESS_KEY` | The storage secret |
| `R2_BUCKET_NAME` | The **public** bucket, for logos |
| `R2_PUBLIC_URL` | The public address of that bucket |
| `R2_PRIVATE_BUCKET_NAME` | The **private** bucket, for CVs. Never turn on public access for this one |

### Email

| Variable | Required | What it's for |
| --- | --- | --- |
| `SMTP_HOST` | Yes | Your mail server |
| `SMTP_PORT` | No | Defaults to `587` |
| `SMTP_SECURE` | No | `true` for port 465, otherwise `false` |
| `SMTP_USER` | No | Your mail server username |
| `SMTP_PASSWORD` | No | Your mail server password |
| `MAIL_FROM` | Yes | The address emails come from |
| `MAIL_FROM_NAME` | No | The name emails come from |

### Optional features

| Variable | What it's for |
| --- | --- |
| `GEMINI_API_KEY` | Lets you turn on AI CV analysis |
| `GOOGLE_OAUTH_CLIENT_ID` | Lets interviewers connect Google Calendar and Meet |
| `GOOGLE_OAUTH_CLIENT_SECRET` | The secret for the same Google client |
| `GOOGLE_OAUTH_REDIRECT_URI` | The API's address followed by `/oauth/google/callback` |
| `RATE_LIMIT_API` | Requests allowed per signed-in user every 15 minutes |
| `RATE_LIMIT_EXPENSIVE` | Uploads allowed per signed-in user every 15 minutes |

## Frontend settings

These go in `frontend/.env`.

| Variable | Required | What it's for |
| --- | --- | --- |
| `DATABASE_URL` | Yes | The same database as the backend. The website uses it for sign-in |
| `BETTER_AUTH_SECRET` | Yes | At least 32 characters. Keep it the same across restarts, or everyone gets signed out |
| `BETTER_AUTH_URL` | Yes | The address people use to open OpenATS |
| `OPENATS_API_URL` | Yes | The API's address, as the website's server reaches it |
| `NEXT_PUBLIC_API_URL` | Yes | The API's address, as a visitor's browser reaches it |
| `NEXT_PUBLIC_APP_URL` | No | Your public address, used in careers page links |
| `AUTH_TRUSTED_PROXIES` | No | Your proxy addresses, so sign-in limits apply per person |
| `SMTP_*`, `MAIL_FROM`, `MAIL_FROM_NAME` | No | Use the same values as the backend. Without them, invite and password reset emails aren't sent |

Never put a secret in a `NEXT_PUBLIC_` variable, because those are visible to anyone who opens the site.

The `NEXT_PUBLIC_DEMO_*` settings show demo sign-in details on the sign-in page. Leave them empty on a real installation.

## Addresses that must match

Most sign-in problems come from these not lining up. Here's a setup with the website at `https://ats.example.com` and the API at `https://api.example.com`:

```ini
# backend/.env
FRONTEND_URL=https://ats.example.com
AUTH_ISSUER=https://ats.example.com
AUTH_JWKS_URL=https://ats.example.com/api/auth/jwks

# frontend/.env
BETTER_AUTH_URL=https://ats.example.com
NEXT_PUBLIC_APP_URL=https://ats.example.com
NEXT_PUBLIC_API_URL=https://api.example.com
OPENATS_API_URL=https://api.example.com
```
