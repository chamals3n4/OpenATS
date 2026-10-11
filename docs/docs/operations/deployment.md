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

Interviews work without Google. There are two separate settings, both in `backend/.env`, and you can use either, both or neither. How OpenATS chooses between them is described in [Interviews and feedback](../using-openats/interviews#google-calendar-and-google-meet).

**Personal connection: each interviewer's own calendar, and Google Meet links**

| Variable | Notes |
| --- | --- |
| `GOOGLE_OAUTH_CLIENT_ID` | From an OAuth client of type "Web application" in Google Cloud, in a project with the Google Calendar API enabled. |
| `GOOGLE_OAUTH_CLIENT_SECRET` | The secret of the same client. |
| `GOOGLE_OAUTH_REDIRECT_URI` | The API's public address followed by `/oauth/google/callback`. It must be listed as an authorised redirect URI on the client. Locally this is `http://localhost:8080/oauth/google/callback`. |

Once these are set, each person connects their own account under **Settings → Integrations**.

**Shared company calendar: a fallback for interviewers who have not connected**

| Variable | Notes |
| --- | --- |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | The JSON key of a Google service account. |
| `GOOGLE_CALENDAR_ID` | The calendar to write to. Share that calendar with the service account's email address, with permission to make changes. |
| `GOOGLE_CALENDAR_ALLOW_ATTENDEES` | Set to `true` only if the service account has Domain-Wide Delegation. Otherwise leave it empty, and guests are listed in the event's description instead of being invited. |

The shared calendar cannot create Google Meet links.

Coming from a version that used WSO2 Asgardeo? Follow [Upgrading to built-in sign-in](./upgrading-to-built-in-auth).
