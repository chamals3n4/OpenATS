---
sidebar_position: 1
title: Deployment and operations
---

Deployment and operations guidance is planned. This page will be expanded with supported deployment patterns, configuration guidance, monitoring, and backup procedures.

## What sign-in needs in production

Sign-in is built into the web application, and the API checks it on every request. Whatever way you deploy, these must be right. The details of each value are in [Sign-in and users](../administration/authentication#settings-an-administrator-needs).

**Web application (`frontend`)**

| Variable | Notes |
| --- | --- |
| `DATABASE_URL` | The same database as the API. The web application now connects to it directly, for sign-in only. |
| `BETTER_AUTH_SECRET` | At least 32 characters. Keep it secret, and keep it the same across restarts and across every copy of the web application. |
| `BETTER_AUTH_URL` | The public address people open, for example `https://ats.example.com`. |

**API (`backend`)**

| Variable | Notes |
| --- | --- |
| `AUTH_JWKS_URL` | The web application's address followed by `/api/auth/jwks`. |
| `AUTH_ISSUER` | Exactly the same as `BETTER_AUTH_URL`. |

Things to check:

- **The API must be able to reach the web application** at `AUTH_JWKS_URL`. If it cannot, every request is rejected as not signed in.
- **Serve the web application over HTTPS.** In production, sign-in cookies are only sent over a secure connection.
- **Behind more than one proxy or load balancer**, set `AUTH_TRUSTED_PROXIES` so that sign-in limits apply per person.
- **Run the database migrations** before starting a new version. They live in `backend/` and include the sign-in tables.
- **Create the first admin** with `make admin` after the first deployment.

Coming from a version that used WSO2 Asgardeo? Follow [Upgrading to built-in sign-in](./upgrading-to-built-in-auth).
