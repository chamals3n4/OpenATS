---
title: Manual Setup
description: Set up OpenATS step by step. Install it, then configure the database, sign-in, Cloudflare R2 storage, SMTP email, Gemini and Google Calendar.
keywords: [OpenATS manual setup, Cloudflare R2 setup, SMTP email setup, Google Calendar OAuth, ATS configuration]
---

# Manual Setup

This does the same as the [Quick Start](make-setup), one step at a time. Use it if you'd like to see how the pieces fit together, if `make setup` didn't work, or when you're setting up storage and email. If you only came here for those, skip to [file storage](#6-set-up-file-storage) or [email](#7-set-up-email).

## 1. Install what you need

You'll need Node.js 22, pnpm, Docker with Compose, and `openssl`. The [Quick Start](make-setup#before-you-start) shows how to check each one.

You'll also need a Cloudflare account for file storage. These are only needed if you want them:

- an email provider with SMTP, to send real email
- Google Cloud, for Calendar and Meet
- Google AI Studio, for AI CV analysis

## 2. Download OpenATS and install packages

```sh
git clone https://github.com/chamals3n4/OpenATS.git
cd OpenATS
pnpm install
```

Run this from the main folder. One command installs both the backend and the frontend.

## 3. Start PostgreSQL and Redis

```sh
docker compose up -d
```

This starts three containers:

| Container | Port | What it's for |
| --- | --- | --- |
| PostgreSQL | `5432` | Your data. The user, password and database are all `openats` |
| Redis | `6379` | The queue for background jobs |
| Mailpit | `1025`, inbox on `8025` | Catches emails while you're testing |

Run `docker compose ps` to check they're all up.

## 4. Create environment files

```sh
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

Generate an encryption key and place it in `backend/.env`:

```sh
openssl rand -base64 32
```

Set `ENCRYPTION_KEY` to the output. The backend won't start without it. Don't change it later, because saved Google connections can't be read with a different key.

The example files already have the right local values for these. For the full list, see [Environment Variables](environment-variables).

```ini
# backend/.env
DATABASE_URL=postgresql://openats:openats@localhost:5432/openats
REDIS_URL=redis://localhost:6379
PORT=8080
FRONTEND_URL=http://localhost:3000

# frontend/.env
OPENATS_API_URL=http://localhost:8080
NEXT_PUBLIC_API_URL=http://localhost:8080
```

## 5. Set up sign-in

Sign-in is built into OpenATS, so there's nothing to register anywhere. You just need a few values in the two `.env` files.

In `frontend/.env`:

```ini
# The same database as the backend
DATABASE_URL=postgresql://openats:openats@localhost:5432/openats
# At least 32 characters. Generate one with: openssl rand -base64 32
BETTER_AUTH_SECRET=<paste the generated value>
BETTER_AUTH_URL=http://localhost:3000
```

In `backend/.env` (these are already correct in the example file for local use):

```ini
AUTH_JWKS_URL=http://localhost:3000/api/auth/jwks
AUTH_ISSUER=http://localhost:3000
```

`AUTH_ISSUER` must be exactly the same as `BETTER_AUTH_URL`. You create the first user in step 10, after the database tables exist. The full reference is in [Sign-in and users](../administration/authentication).

## 6. Set up file storage

:::caution[This step is required]
The backend won't start while any `R2_` value is empty. If you only want a quick look, placeholder values will get it running, as shown in the [Quick Start](make-setup#3-add-your-file-storage-details), but uploads won't work.
:::

R2 stores CVs and logos. Open the [Cloudflare R2 dashboard](https://dash.cloudflare.com/?to=/:account/r2/overview) and select the Cloudflare account you will use for OpenATS.

OpenATS uses two buckets, so that CVs can never be opened by a link:

- a **public** bucket for company logos, which are shown on the careers page and in emails
- a **private** bucket for CVs, which are only ever sent by the OpenATS server to signed-in users

1. Select **Create bucket** and create the private one, for example `openats-cvs`. Leave public access off and do not connect a custom domain to it.
2. Create a second bucket for logos, for example `openats-public`. Under **Settings**, turn on public access (the `r2.dev` address, or a custom domain) and copy its public URL.
3. Return to **R2 Overview** and select **Manage** beside **API Tokens**.
4. Select **Create Account API Token** or **Create User API Token**.
5. Choose **Object Read & Write**, then restrict the token to those two buckets where possible.
6. Create the token and immediately copy its **Access Key ID**, **Secret Access Key**, and **S3 API endpoint**. Cloudflare only shows the secret once.

Find the Cloudflare Account ID in the dashboard. The endpoint normally follows this format:

```ini
R2_ENDPOINT=https://<ACCOUNT_ID>.r2.cloudflarestorage.com
R2_ACCESS_KEY_ID=<Access Key ID>
R2_SECRET_ACCESS_KEY=<Secret Access Key>
R2_BUCKET_NAME=openats-public
R2_PUBLIC_URL=<public URL of the logo bucket>
R2_PRIVATE_BUCKET_NAME=openats-cvs
```

See [Cloudflare’s R2 S3 guide](https://developers.cloudflare.com/r2/get-started/s3/) if the dashboard labels differ.

## 7. Set up email

OpenATS sends email through any SMTP server. Locally, `docker compose up -d` starts Mailpit and the default values send to it: every email appears at http://localhost:8025 and nothing reaches a real inbox.

For real email, set these in `backend/.env`, and the same values in `frontend/.env` for invite and password reset emails:

```ini
SMTP_HOST=smtp.resend.com
SMTP_PORT=465
SMTP_SECURE=true          # true only for port 465
SMTP_USER=resend
SMTP_PASSWORD=re_...
MAIL_FROM=hiring@example.com
MAIL_FROM_NAME=OpenATS
```

| Provider | `SMTP_HOST` | `SMTP_PORT` / `SMTP_SECURE` | `SMTP_USER` / `SMTP_PASSWORD` |
| --- | --- | --- | --- |
| Resend | `smtp.resend.com` | 465 / true | `resend` / API key |
| Gmail, Google Workspace | `smtp.gmail.com` | 465 / true | address / app password |
| Microsoft 365 | `smtp.office365.com` | 587 / false | address / password |
| Amazon SES | `email-smtp.<region>.amazonaws.com` | 587 / false | SES SMTP credentials |
| Brevo | `smtp-relay.brevo.com` | 587 / false | login / SMTP key |

`MAIL_FROM` must be an address the SMTP account may send as, on a domain with SPF and DKIM set up, or emails land in spam. Most cloud servers block port 25, so use 587 or 465. The server checks the connection at start and logs a warning if it cannot log in.

## 8. Set up AI CV analysis (optional)

This step is optional. OpenATS starts and works fully without a Gemini key. Skip it if you do not want candidates' CVs sent to a third party.

AI CV analysis sends each candidate's CV to Google Gemini, which writes a summary, strengths and gaps for recruiters to read. It needs two things:

1. **A Gemini API key on the backend.** Open [Google AI Studio](https://aistudio.google.com/app/apikey), create an API key for a Google Cloud project, and restrict it to the services and environments that need it. Add it only to the backend, then restart the backend and the worker:

   ```ini
   GEMINI_API_KEY=<your Gemini API key>
   ```

2. **The switch in the app.** The feature is **off by default**, even with a key. A Super Admin or Hiring Manager turns it on under **Settings → General → AI CV analysis**. Without a key the switch is disabled and shows "Add a Gemini API key to use this".

AI analysis runs in the background worker, which has to be running anyway (see step 11). Never expose this key through a `NEXT_PUBLIC_` variable.

## 9. Connect Google Calendar and Meet (optional)

Interviews work without Google. With it, each interviewer can connect their own Google account, so their interviews go in their calendar and can get a Google Meet link.

1. Open the [Google Cloud Console](https://console.cloud.google.com/), create a project called something like `OpenATS`, and select it.
2. Open **APIs & Services** → **Library**, search for **Google Calendar API**, and select **Enable**.
3. Open **APIs & Services** → **OAuth consent screen** and set it up. While the app is in testing, add the Google accounts that will connect as test users.
4. Open **APIs & Services** → **Credentials**, select **Create credentials** → **OAuth client ID**, and choose **Web application**.
5. Under **Authorised redirect URIs**, add the API's address followed by `/oauth/google/callback`. Locally that is `http://localhost:8080/oauth/google/callback`.
6. Copy the client ID and the client secret into `backend/.env`, with the same redirect URI:

```ini
GOOGLE_OAUTH_CLIENT_ID=<your client ID>
GOOGLE_OAUTH_CLIENT_SECRET=<your client secret>
GOOGLE_OAUTH_REDIRECT_URI=http://localhost:8080/oauth/google/callback
```

Restart the backend. Each person then connects their own account under **Settings → Integrations**. See [Interviews and feedback](../using-openats/interviews#google-calendar-and-google-meet) for what the connection does.

## 10. Create the database schema and the first admin

```sh
cd backend
pnpm drizzle-kit migrate
pnpm tsx src/db/seed.ts
cd ..
```

Migrations create the tables, including the ones sign-in uses. Seeding adds the default pipeline stages: Screening, Screening Qualified, Screening Disqualified, Interviews, Shortlisted, Offer and Hired.

There is no public sign-up, so create the first **Super Admin** from the command line:

```sh
make admin
```

It asks for an email, a name and a password. Without `make`, run `pnpm --filter ./frontend exec tsx scripts/create-admin.ts` from the repository root.

## 11. Start OpenATS

Open three terminals, each starting in the main folder. (`make dev` does all of this in one.)

**Terminal 1: API**

```sh
cd backend
pnpm dev
```

**Terminal 2: background worker (required)**

```sh
cd backend
pnpm dev:worker
```

The worker is not optional. It reads the text of every uploaded CV, which is what CV search looks through, and erases the files of deleted candidates. Without it CVs stay "pending" for ever and nothing reports an error. **Settings > General** shows a warning when no worker is connected, and `GET /health` on the API reports `"worker": "missing"`.

**Terminal 3: web application**

```sh
cd frontend
pnpm dev
```

Open `http://localhost:3000`, sign in with the admin you created in step 10, and create a test job. If a provider is not configured, leave its variables blank and do not use that feature until it is configured.

## 12. Check it works

Before you invite anyone, run through this list:

1. Open http://localhost:8080/health. You want `"status":"ok"` and `"worker":"connected"`.
2. Sign in and [set up your company](../using-openats/first-login-and-company-setup).
3. Create and publish a job.
4. Apply at http://localhost:3000/careers with a PDF CV.
5. Open the candidate. Their **CV Summary** tab should fill in within a few seconds.
6. Check the application email in Mailpit.

Test any optional features one at a time, so if something breaks you'll know which one caused it. If you hit a problem, see [Troubleshooting](troubleshooting). Ready to go live? See [Deploy to Production](deployment).
