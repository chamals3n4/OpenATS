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

## Google Calendar and Google Meet (optional)

Interviews work without Google. With these settings in `backend/.env`, each interviewer can connect their own Google account, so their interviews go in their calendar and can get a Google Meet link. What the connection does is described in [Interviews and feedback](../using-openats/interviews#google-calendar-and-google-meet).

| Variable | Notes |
| --- | --- |
| `GOOGLE_OAUTH_CLIENT_ID` | From an OAuth client of type "Web application" in Google Cloud, in a project with the Google Calendar API enabled. |
| `GOOGLE_OAUTH_CLIENT_SECRET` | The secret of the same client. |
| `GOOGLE_OAUTH_REDIRECT_URI` | The API's public address followed by `/oauth/google/callback`. It must be listed as an authorised redirect URI on the client. |

Once these are set, each person connects their own account under **Settings → Integrations**.

## The background worker (required)

Run the worker beside the API, as its own long-running process, with the same `backend/.env`:

```sh
cd backend
pnpm build
pnpm start          # the API
pnpm start:worker   # the background worker
```

It reads the text of every uploaded CV, erases the files of deleted candidates, and runs AI CV analysis when that is turned on. If it is not running, CVs stay "pending", CV search misses them, and deleted candidates' files are left in storage, with no error anywhere. Keep it running under the same process manager as the API (systemd, PM2, a second container).

To check it: `GET /health` on the API includes `"worker": "connected"` or `"worker": "missing"`, and **Settings > General** shows a warning when none is connected. A missing worker does not make `/health` fail, because restarting the API would not fix it; alert on the `worker` field.

Each CV is read with a 30 second limit. A file that takes longer is marked as unreadable and skipped, so one bad PDF cannot hold up the rest.

## Behind a proxy: `TRUST_PROXY`

In production the API normally sits behind Nginx or a load balancer. Every request then reaches the API from the proxy's address, and unless the API is told to trust the proxy, all visitors look like one. The rate limits on the careers page are per address, so they would be shared by everybody: five applications in fifteen minutes for your whole careers page.

`TRUST_PROXY` in `backend/.env` says how many proxies are in front of the API.

| Value | When |
| --- | --- |
| `1` (the default) | One proxy in front: Nginx, or one load balancer. |
| `2`, `3`, ... | That many proxies in a row, for example a CDN and then Nginx. |
| `false` | The API is reached directly, with nothing in front. |
| `10.0.0.0/8,172.16.0.5` | The addresses or subnets of your proxies, when you would rather name them. |

`true` is refused, because it would let any visitor choose their own address and never reach a limit.

The proxy has to pass the visitor's address on. With Nginx:

```nginx
location / {
    proxy_pass http://127.0.0.1:8080;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

To confirm it works, look at the API's request log: each line starts with the visitor's address. If every line shows `127.0.0.1` or the proxy's address, the header is not arriving or `TRUST_PROXY` is too low.

The limits are counted in the memory of each API process. If you run several (PM2 cluster mode, several containers), each has its own count, so a visitor's real budget is the limit times the number of processes.

Coming from a version that used WSO2 Asgardeo? Follow [Upgrading to built-in sign-in](./upgrading-to-built-in-auth).
