---
title: Deploy OpenATS on Render
sidebar_label: Render
description: Put the whole of OpenATS on Render, step by step. The API, the background worker, the website, Redis, a Neon database, environment groups, custom domains and every setting you need.
keywords: [deploy OpenATS on Render, Render Node.js monorepo, Render background worker, Render Key Value Redis, Neon Postgres, self-hosted ATS]
---

# Deploy OpenATS on Render

This guide puts all of OpenATS on [Render](https://render.com): the API, the background worker and the website, with Redis on Render and the database on [Neon](https://neon.com). Render builds from your GitHub repository, gives every service HTTPS, and redeploys when you push. You don't manage a server.

It takes about an hour the first time. Most of that is creating accounts and copying values, so keep a notes file open as you go.

**Jump to:** [Before you start](#before-you-start) · [Database](#step-2-create-the-database-on-neon) · [Redis](#step-6-create-redis-on-render) · [Environment groups](#step-9-create-the-environment-groups) · [Backend (API)](#step-10-create-the-backend-api) · [Worker](#step-11-create-the-background-worker) · [Frontend (website)](#step-12-create-the-frontend-website) · [Custom domains](#step-13-add-your-own-domains) · [Check it works](#step-15-check-everything-works) · [Updates](#update-to-a-new-version) · [Troubleshooting](#troubleshooting)

:::tip[Only want the website on Vercel?]
You can run the backend on Render and the website on Vercel. Follow this guide but skip [Step 12](#step-12-create-the-frontend-website), then follow [Deploy the Frontend on Vercel](./vercel-frontend).
:::

## What you'll end up with

| Piece | Where it runs | What it does |
| --- | --- | --- |
| **Frontend (website)** | Render web service | The dashboard, the careers page and sign-in |
| **Backend (API)** | Render web service | The hiring logic, data access and live updates |
| **Worker** | Render background worker | Reads CVs, deletes files of removed candidates, runs AI CV analysis |
| **Redis** | Render Key Value | The queue the API hands jobs to the worker through |
| **Database** | Neon | Everything except files |
| **File storage** | Cloudflare R2 | CVs (private bucket) and logos (public bucket) |
| **Email** | Any SMTP provider | Invites, password resets and every email to candidates |

The API, worker and website are three separate Render services built from the same repository. They all need to be in the **same Render region**, and the Neon database should be close to that region too.

## Before you start

### Accounts you need

- [ ] **GitHub**, with your own fork of [OpenATS](https://github.com/chamals3n4/OpenATS). Render deploys from a repository you control.
- [ ] **Render.** Add a payment card if you plan to use paid instances (you will for real use, see below).
- [ ] **Neon**, for the database.
- [ ] **Cloudflare**, for R2 file storage. **This is required.** The backend won't start without it.
- [ ] **An email provider with SMTP**, such as Resend, Brevo, Amazon SES, Google Workspace or Microsoft 365. **This is required.** The backend won't start without `SMTP_HOST` and `MAIL_FROM`, and without working email nobody can be invited.

### Recommended

- [ ] **A domain you own**, such as `example.com`. You can run on `onrender.com` addresses, but candidates will see them in every email and on your careers page.

### Optional

- [ ] **Google Cloud**, if interviewers should get interviews in their Google Calendar with a Meet link.
- [ ] **A Gemini API key**, if you want AI CV analysis. It sends CVs to Google, so it's off unless you turn it on.

### On your own computer

You'll run a few one-time setup commands from your computer, because Render's free and starter services have no terminal you can use for them. You need:

- Node.js 22, pnpm, Git and `openssl`
- A copy of your fork: `git clone https://github.com/<you>/OpenATS.git && cd OpenATS && pnpm install`

## How big each piece should be

Render's **Free** plan is fine to look around, but it isn't enough to run OpenATS for real. Here's what each piece needs:

| Piece | To try it out | Minimum for real use |
| --- | --- | --- |
| Frontend (website) | Free | **Starter** (512 MB). Move to Standard if Render shows it restarting for lack of memory |
| Backend (API) | Free | **Starter** (512 MB) |
| Worker | Not available on Free. Run it inside the API instead (see [Step 11](#step-11-create-the-background-worker)) | **Starter** (512 MB) |
| Redis (Key Value) | Free | **Starter**, the smallest plan that keeps its data on disk |
| Database (Neon) | Free | Free works for a small team. Move to **Launch** for a longer restore window and to stop the database sleeping |

What the Free plan costs you:

- **Free web services go to sleep after 15 minutes** without visitors. The next visitor waits about a minute while it wakes up. A candidate applying from your careers page would see that wait.
- **While the API sleeps, nothing runs on a timer.** Offers don't expire, unanswered assignments aren't closed, and unused uploads aren't cleaned up until something wakes it.
- **There's no background worker on Free.** You'd run it inside the API, which also sleeps.
- **Free Redis loses everything when it restarts.** Any CV still waiting to be read is dropped and stays on pending until it's sent again.
- **Free Render Postgres is deleted after 30 days.** That's one reason this guide uses Neon.

Prices change, so check [Render's pricing](https://render.com/pricing) and [Neon's pricing](https://neon.com/pricing) for current figures.

## Step 1. Pick a region

Choose one Render region for everything, close to most of your users. The options are Oregon, Ohio, Virginia, Frankfurt and Singapore. You can't move a service to another region later without recreating it.

Then pick the matching Neon region:

| Render region | Neon region |
| --- | --- |
| Oregon (US West) | AWS US West 2 (Oregon) |
| Ohio (US East) | AWS US East 2 (Ohio) |
| Virginia (US East) | AWS US East 1 (N. Virginia) |
| Frankfurt (EU Central) | AWS Europe Central 1 (Frankfurt) |
| Singapore (Southeast Asia) | AWS Asia Pacific 1 (Singapore) |

Every page in the dashboard makes several database queries, so a database on the other side of the world makes everything feel slow.

## Step 2. Create the database on Neon

1. Sign in to [Neon](https://console.neon.tech) and select **New Project**.
2. Name it `openats`, keep the latest Postgres version, and choose the region from Step 1.
3. Once it's created, select **Connect**.
4. **Turn connection pooling off**, so the address you copy does *not* contain `-pooler`. The API, worker and website all run all the time on Render and keep their own small set of connections, so they don't need Neon's pooler, and the database setup commands in Step 8 need a direct connection anyway.
5. Copy the connection string. It looks like this:

   ```text
   postgresql://neondb_owner:abc123@ep-cool-name-123456.us-east-2.aws.neon.tech/neondb?sslmode=require
   ```

Keep `?sslmode=require` on the end. This is your `DATABASE_URL`.

On Neon's Free plan the database goes to sleep after 5 minutes without queries and wakes on the next one, which adds a short pause. OpenATS reconnects by itself, so you don't need to do anything about it.

:::note[Would rather use Render Postgres?]
That works too. Create it in the same region, choose a paid plan (the free one is deleted after 30 days), and use its **Internal Database URL** as `DATABASE_URL`. For Step 8, which runs on your computer, use its **External Database URL** instead.
:::

## Step 3. Set up file storage on Cloudflare R2

OpenATS uses two buckets, so that a CV can never be opened by a link:

- a **private** bucket for CVs, which only the API ever reads
- a **public** bucket for company logos, shown on the careers page and in emails

1. Open the [R2 dashboard](https://dash.cloudflare.com/?to=/:account/r2/overview).
2. Create the private bucket, for example `openats-cvs`. **Leave public access off and don't connect a domain to it.**
3. Create the public bucket, for example `openats-public`. Under its **Settings**, turn on public access (the `r2.dev` address or your own domain) and copy its public address.
4. Back on the R2 overview, select **Manage** beside **API Tokens** and create a token with **Object Read & Write**, limited to those two buckets.
5. Copy the **Access Key ID**, the **Secret Access Key** and the **S3 endpoint** right away. Cloudflare only shows the secret once.

You now have all six storage values:

```ini
R2_ENDPOINT=https://<your-account-id>.r2.cloudflarestorage.com
R2_ACCESS_KEY_ID=<access key id>
R2_SECRET_ACCESS_KEY=<secret access key>
R2_BUCKET_NAME=openats-public
R2_PUBLIC_URL=https://pub-xxxxxxxx.r2.dev
R2_PRIVATE_BUCKET_NAME=openats-cvs
```

The full walkthrough, with screenshots described, is in [Manual Setup, step 6](../getting-started/quick-start#6-set-up-file-storage).

:::warning[Don't use `STORAGE=local` on Render]
OpenATS can also keep files in a folder on the server (`STORAGE=local`), as the Docker quickstart does. That doesn't work on Render. A Render service loses its files every time it redeploys or restarts, and the worker runs on a different machine from the API, so it could never read the CVs. Use R2, or another S3-compatible store, and leave `STORAGE` unset.
:::

## Step 4. Set up email

Get SMTP details from your email provider. With Resend, for example:

```ini
SMTP_HOST=smtp.resend.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=resend
SMTP_PASSWORD=re_xxxxxxxxx
MAIL_FROM=hiring@example.com
MAIL_FROM_NAME=Example Careers
```

Two things that catch people out:

- `MAIL_FROM` must be on a domain you've verified with the provider (SPF and DKIM set up), or emails go to spam or are refused.
- Use port **465** with `SMTP_SECURE=true`, or port **587** with `SMTP_SECURE=false`. Don't use port 25.

Settings for other providers are in [Manual Setup, step 7](../getting-started/quick-start#7-set-up-email).

## Step 5. Create your two secrets

On your computer, run:

```sh
openssl rand -base64 32   # this is ENCRYPTION_KEY, for the backend
openssl rand -base64 32   # this is BETTER_AUTH_SECRET, for the frontend
```

Use a **different** value for each. Save both in a password manager. If you lose `ENCRYPTION_KEY`, everyone has to reconnect Google Calendar. If you change `BETTER_AUTH_SECRET`, everyone is signed out.

## Step 6. Create Redis on Render

1. In the [Render dashboard](https://dashboard.render.com), select **New** > **Key Value**.
2. Name it `openats-redis` and choose your region.
3. Set **Maxmemory Policy** to **`noeviction`**. This matters. Any other choice lets Redis quietly delete queued jobs when it fills up, and CVs would stay on pending with no error anywhere.
4. Pick a plan (see [the sizes above](#how-big-each-piece-should-be)) and create it.
5. Open it, select **Connect**, and copy the **Internal** URL. It starts with `redis://`. This is your `REDIS_URL`.

The internal address only works from Render services in the same region, which is exactly what you want. You don't need to add anything to the IP allow list.

## Step 7. Decide your addresses

The backend and frontend need to know each other's public address. Decide them now.

**With your own domain (recommended):**

- Frontend: `https://ats.example.com`
- Backend: `https://api.example.com`

**With Render's addresses:** each service gets `https://<service-name>.onrender.com`. If the name is already taken, Render adds a few characters to it, so you'll only know the real address once the service exists. Use your best guess (`https://openats-web.onrender.com` and `https://openats-api.onrender.com`), then fix the values after [Step 12](#step-12-create-the-frontend-website) if Render changed them.

The rest of this guide uses `ats.example.com` and `api.example.com`. Swap in your own.

## Step 8. Create the tables and your first admin

Run these once, from the OpenATS folder on your computer, with your Neon `DATABASE_URL`:

```sh
# Create the tables
cd backend
DATABASE_URL="postgresql://...neon.tech/neondb?sslmode=require" pnpm drizzle-kit migrate

# Add the default pipeline stages
DATABASE_URL="postgresql://...neon.tech/neondb?sslmode=require" pnpm tsx src/db/seed.ts
cd ..
```

There's no public sign-up, so create your first Super Admin. Use the same `BETTER_AUTH_SECRET` and frontend address you'll give Render:

```sh
DATABASE_URL="postgresql://...neon.tech/neondb?sslmode=require" \
BETTER_AUTH_SECRET="<your BETTER_AUTH_SECRET>" \
BETTER_AUTH_URL="https://ats.example.com" \
pnpm --filter ./frontend exec tsx scripts/create-admin.ts
```

It asks for your email, name and a password. Values typed on the command line like this take priority over any `.env` files you have locally, so you won't touch your local database by accident.

## Step 9. Create the environment groups

An environment group is a set of variables you write once and attach to several services. OpenATS uses three, so each service gets exactly what it needs and nothing is typed twice.

In Render, go to **Environment Groups** > **New Environment Group** for each one below.

:::caution[Don't put the same variable in two groups]
If two linked groups both contain a variable, Render doesn't promise which one wins. Every variable below appears in exactly one group.
:::

### Group 1: `openats-shared`

Used by **all three services**: the API, the worker and the website.

| Variable | Example | Notes |
| --- | --- | --- |
| `DATABASE_URL` | `postgresql://...neon.tech/neondb?sslmode=require` | From Step 2. The website uses it for sign-in |
| `SMTP_HOST` | `smtp.resend.com` | From Step 4 |
| `SMTP_PORT` | `465` | |
| `SMTP_SECURE` | `true` | `true` for 465, `false` for 587 |
| `SMTP_USER` | `resend` | |
| `SMTP_PASSWORD` | `re_xxxxxxxxx` | |
| `MAIL_FROM` | `hiring@example.com` | |
| `MAIL_FROM_NAME` | `Example Careers` | Optional |
| `NODE_VERSION` | `22` | OpenATS is built and tested on Node 22 |

The website sends invite and password reset emails itself, which is why it needs the email settings too.

### Group 2: `openats-backend`

Used by the **API and the worker**.

| Variable | Example | Notes |
| --- | --- | --- |
| `REDIS_URL` | `redis://red-xxxxxxxx:6379` | The internal URL from Step 6 |
| `FRONTEND_URL` | `https://ats.example.com` | Every link in a candidate email starts with this |
| `AUTH_ISSUER` | `https://ats.example.com` | Must match `BETTER_AUTH_URL` exactly |
| `AUTH_JWKS_URL` | `https://ats.example.com/api/auth/jwks` | The frontend address plus `/api/auth/jwks` |
| `ENCRYPTION_KEY` | `kQ3...=` | From Step 5 |
| `R2_ENDPOINT` | `https://<account-id>.r2.cloudflarestorage.com` | From Step 3 |
| `R2_ACCESS_KEY_ID` | | |
| `R2_SECRET_ACCESS_KEY` | | |
| `R2_BUCKET_NAME` | `openats-public` | The public bucket |
| `R2_PUBLIC_URL` | `https://pub-xxxxxxxx.r2.dev` | |
| `R2_PRIVATE_BUCKET_NAME` | `openats-cvs` | The private bucket |
| `TRUST_PROXY` | `1` | See [Step 14](#step-14-check-the-api-sees-real-visitor-addresses) |
| `GEMINI_API_KEY` | | Optional. Only for AI CV analysis |
| `GOOGLE_OAUTH_CLIENT_ID` | | Optional. See [Google Calendar and Meet](#optional-google-calendar-and-meet) |
| `GOOGLE_OAUTH_CLIENT_SECRET` | | Optional |
| `GOOGLE_OAUTH_REDIRECT_URI` | `https://api.example.com/oauth/google/callback` | Optional |
| `RATE_LIMIT_API` | `1000` | Optional. Requests per signed-in user every 15 minutes |
| `RATE_LIMIT_EXPENSIVE` | `60` | Optional. Uploads per signed-in user every 15 minutes |

Leave out the optional ones you don't use, and leave out `STORAGE`, `STORAGE_DIR` and `API_PUBLIC_URL` (see the warning in Step 3). **Don't set `PORT`.** Render sets it, and the API listens on whatever it's given.

### Group 3: `openats-website`

Used by the **website** only.

| Variable | Example | Notes |
| --- | --- | --- |
| `BETTER_AUTH_SECRET` | `Zp9...=` | From Step 5. The same one you used in Step 8 |
| `BETTER_AUTH_URL` | `https://ats.example.com` | The frontend's own address |
| `NEXT_PUBLIC_APP_URL` | `https://ats.example.com` | Used in careers page links and link previews |
| `NEXT_PUBLIC_API_URL` | `https://api.example.com` | The backend address, as a browser reaches it |
| `OPENATS_API_URL` | `https://api.example.com` | The backend address, as the website's server reaches it |

Anything starting with `NEXT_PUBLIC_` is built into the website and visible to anyone, so never put a secret in one. It's also why changing one needs a new build, not just a restart. Render handles that when you save.

Leave `AUTH_TRUSTED_PROXIES`, `OPENATS_PUBLIC_API_URL` and the `NEXT_PUBLIC_DEMO_*` settings out. `OPENATS_PUBLIC_API_URL` is for prebuilt Docker images; without it the website uses `NEXT_PUBLIC_API_URL`.

## Step 10. Create the backend (API)

1. Select **New** > **Web Service** and connect your fork.
2. Fill in the form:

   | Setting | Value |
   | --- | --- |
   | Name | `openats-api` |
   | Language | Node |
   | Branch | `main` |
   | Region | Your region from Step 1 |
   | Root Directory | **Leave empty** |
   | Build Command | `corepack enable && pnpm install --frozen-lockfile && pnpm --filter ./backend build` |
   | Start Command | `pnpm --filter ./backend start` |
   | Instance Type | Starter or larger |

   The root directory stays empty because OpenATS is one workspace with a single lockfile at the top. Render can't see files outside the root directory, so pointing it at `backend` would break the install. `corepack enable` makes Render use the exact pnpm version the project asks for.

3. Open **Advanced** and set:

   | Setting | Value |
   | --- | --- |
   | Health Check Path | `/health` |
   | Pre-Deploy Command | `pnpm --filter ./backend exec drizzle-kit migrate` (paid instances only, see below) |
   | Build Filters, included paths | `backend/**`, `package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml` |

   The **pre-deploy command** applies new database changes before each new version starts, so you never have to remember. Render only offers it on paid instances. On Free, run the migration from your computer instead, as in Step 8.

   The **build filters** stop the API redeploying when only the website or the docs change.

4. Create the service. Then open its **Environment** page and link **`openats-shared`** and **`openats-backend`**.

The first deploy may fail with `Missing or invalid environment variables` if it started before the groups were linked. That's expected. Linking them starts a fresh deploy.

When it's live, open `https://openats-api.onrender.com/health` (or your address). You should see `"status":"ok"`.

## Step 11. Create the background worker

The worker reads every CV that's uploaded, so search and the candidate page can use it. **Don't skip it.** Without it, CVs stay on pending, CV search misses them, and deleted candidates' files are left in storage. Nothing shows an error except a warning in **Settings > General**.

1. Select **New** > **Background Worker** and connect the same fork.
2. Fill in the form:

   | Setting | Value |
   | --- | --- |
   | Name | `openats-worker` |
   | Language | Node |
   | Branch | `main` |
   | Region | The same region |
   | Root Directory | **Leave empty** |
   | Build Command | `corepack enable && pnpm install --frozen-lockfile && pnpm --filter ./backend build` |
   | Start Command | `pnpm --filter ./backend start:worker` |
   | Instance Type | Starter or larger |
   | Build Filters, included paths | `backend/**`, `package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml` |

3. Create it, then link **`openats-shared`** and **`openats-backend`** on its **Environment** page.

The worker has no web address and no health check. To see that it's running, open the API's `/health` again. It should now say `"worker":"connected"`.

### No worker? Run it inside the API

If you're on the Free plan, or want to save a service, you can run the worker inside the API instead:

1. Don't create the background worker.
2. On the **API service's own Environment page** (not in a group), add `RUN_WORKER_IN_API` = `true`.

Put it on the API service only. If it were in `openats-backend`, a separate worker would also pick it up and you'd have two sets of workers. On Free, CVs are only read while the API is awake.

## Step 12. Create the frontend (website)

1. Select **New** > **Web Service** and connect the same fork.
2. Fill in the form:

   | Setting | Value |
   | --- | --- |
   | Name | `openats-web` |
   | Language | Node |
   | Branch | `main` |
   | Region | The same region |
   | Root Directory | **Leave empty** |
   | Build Command | `corepack enable && pnpm install --frozen-lockfile && pnpm --filter ./frontend build` |
   | Start Command | `pnpm --filter ./frontend start` |
   | Instance Type | Starter or larger |

3. Under **Advanced**:

   | Setting | Value |
   | --- | --- |
   | Health Check Path | `/login` |
   | Build Filters, included paths | `frontend/**`, `package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml` |

4. Create it, then link **`openats-shared`** and **`openats-website`** on its **Environment** page.

Once it's live, open its address. You should see the sign-in page. **If Render gave any service a different address from the one you guessed in Step 7, fix it now** in the groups, using the list in [Step 13](#update-the-addresses-everywhere).

## Step 13. Add your own domains

Skip this if you're staying on `onrender.com` addresses.

1. Open the website service, go to **Settings** > **Custom Domains**, and add `ats.example.com`.
2. Open the API service and add `api.example.com`.
3. At your DNS provider, add a **CNAME** record for each, pointing to the service's `onrender.com` address. Remove any `AAAA` records for those names, because Render doesn't support IPv6.
4. Wait a few minutes. Render checks the records and issues HTTPS certificates by itself.

If your DNS is on Cloudflare, set both records to **DNS only** (grey cloud) to begin with, so Render can verify them. If you later turn on Cloudflare's proxy, set **SSL/TLS** to **Full**, and remember you've added another proxy in front of the API (see Step 14).

### Update the addresses everywhere

When an address changes, update all of these. Saving a group redeploys every service linked to it.

| Group | Variable | New value |
| --- | --- | --- |
| `openats-backend` | `FRONTEND_URL` | `https://ats.example.com` |
| `openats-backend` | `AUTH_ISSUER` | `https://ats.example.com` |
| `openats-backend` | `AUTH_JWKS_URL` | `https://ats.example.com/api/auth/jwks` |
| `openats-backend` | `GOOGLE_OAUTH_REDIRECT_URI` | `https://api.example.com/oauth/google/callback` (if you use Google) |
| `openats-website` | `BETTER_AUTH_URL` | `https://ats.example.com` |
| `openats-website` | `NEXT_PUBLIC_APP_URL` | `https://ats.example.com` |
| `openats-website` | `NEXT_PUBLIC_API_URL` | `https://api.example.com` |
| `openats-website` | `OPENATS_API_URL` | `https://api.example.com` |

If you use Google Calendar, also update the redirect address in the Google Cloud Console. Sign-in only works on the address in `BETTER_AUTH_URL`, so after this change use your own domain, not the `onrender.com` one.

## Step 14. Check the API sees real visitor addresses

The careers page limits how often one visitor can apply or upload. That only works if the API can tell visitors apart. On Render, requests pass through Render's own proxies before they reach the API, and Render doesn't publish how many there are, so check it:

1. Open your careers page from your own browser.
2. Open the API service's **Logs** in Render. Each request line starts with the visitor's address.
3. Compare it to your own public IP address (search "what is my IP").

If the logs show your address, you're done. If they show some other address, raise `TRUST_PROXY` in `openats-backend` to `2`, save, and check again. Go up one at a time until your own address appears. Don't go higher than you need, and never use `true`, which the API refuses because it would let anyone fake their address.

If you put Cloudflare's proxy in front of the API later, that's one more, so check again.

## Step 15. Check everything works

1. Open `https://api.example.com/health`. You want `"status":"ok"` and `"worker":"connected"`.
2. Sign in at `https://ats.example.com` with the admin from Step 8, and [set up your company](../using-openats/first-login-and-company-setup).
3. Upload a logo in company settings. It should appear straight away. If it doesn't, check the `R2_` values and that the public bucket really is public.
4. Create a job, publish it, and apply from your careers page with a real PDF CV.
5. Open that candidate. The CV should be readable within a few seconds. If it stays on pending, the worker isn't running.
6. Invite a test user. Check the email arrives and the link in it starts with your real address.
7. Open the same job's team chat in two browser windows and send a message from one. It should appear in the other by itself. That shows live updates work.

Set up a free uptime monitor (Render's own notifications, or a service like UptimeRobot) on `/health`. It fails when the database or Redis is down. A missing worker doesn't make it fail, so watch the `worker` field as well.

## Optional: Google Calendar and Meet

With this, each interviewer can connect their own Google account, so interviews go in their calendar with an optional Meet link.

1. In the [Google Cloud Console](https://console.cloud.google.com/), create a project and enable the **Google Calendar API**.
2. Set up the **OAuth consent screen**.
   - If everyone who will connect is in your Google Workspace, choose **Internal**. That's the simplest.
   - Otherwise choose **External** and, once it works, **publish the app**. While it's in **Testing**, only listed test users can connect, and Google ends their connection after 7 days, so interviews quietly stop reaching calendars.
3. Under **Credentials**, create an **OAuth client ID** of type **Web application**.
4. Under **Authorised redirect URIs**, add `https://api.example.com/oauth/google/callback`. This is your **backend** address, not the website.
5. Put the client ID, client secret and that same redirect address into `openats-backend`.

People then connect their own accounts under **Settings > Integrations**. Full details are in [Manual Setup, step 9](../getting-started/quick-start#9-connect-google-calendar-and-meet-optional).

## Optional: AI CV analysis

1. Create a key in [Google AI Studio](https://aistudio.google.com/app/apikey).
2. Add it to `openats-backend` as `GEMINI_API_KEY`.
3. In OpenATS, a Super Admin turns it on under **Settings > General**. It stays off until then, even with a key.

This sends each CV to Google. Make sure your privacy notice for candidates says so before you turn it on.

## Update to a new version

1. Read the [release notes](https://github.com/chamals3n4/OpenATS/releases). A version can include extra steps.
2. If you **don't** have a pre-deploy command (Free plan), apply the database changes first, from your computer:

   ```sh
   git pull upstream main     # or download the new version
   pnpm install
   cd backend
   DATABASE_URL="postgresql://...neon.tech/neondb?sslmode=require" pnpm drizzle-kit migrate
   ```

3. On GitHub, open your fork and select **Sync fork**. Render sees the new commit and redeploys the services whose files changed. With a pre-deploy command, the migration runs by itself before the new API starts.

If a deploy fails, Render keeps the old version running, so nobody sees a broken site.

## Backups

- **Database.** Neon keeps a history you can restore from: up to 6 hours on Free and up to 7 days on Launch. For anything you'd hate to lose, also take your own copy on a schedule with `pg_dump "$DATABASE_URL" > openats-$(date +%F).sql`.
- **CVs.** Copy the private R2 bucket somewhere else on a schedule.
- **Secrets.** Keep `ENCRYPTION_KEY` and `BETTER_AUTH_SECRET` in a password manager. Render keeps them too, but you'll want them if you ever move.
- **Redis** holds nothing you need to back up. It's only the queue.

Old backups contain candidates you've since deleted, so remove them on a schedule. See [Delete Candidate Data](../administration/deleting-candidate-data).

## Troubleshooting

**The build fails with `ERR_PNPM_BAD_PM_VERSION`, or `pnpm: command not found`.**
Make sure the build command starts with `corepack enable &&`, and that `NODE_VERSION` is `22` in `openats-shared`.

**The build fails because it can't find `pnpm-lock.yaml` or a package.**
The **Root Directory** must be empty. Clear it under the service's **Settings**.

**The service stops with `Missing or invalid environment variables`.**
The log lists which ones. Usually a group isn't linked to that service, or a value has a typo. The API and worker need `openats-shared` and `openats-backend`. The website needs `openats-shared` and `openats-website`.

**Sign-in fails, or you sign in and get sent straight back to the sign-in page.**
The addresses don't line up. `BETTER_AUTH_URL` and `AUTH_ISSUER` must be the same, character for character, with no slash at the end. And you must open the site on that exact address.

**CVs stay on pending.**
Check `/health` for `"worker":"connected"`. If it says otherwise, look at the worker's logs. If Redis was on the Free plan and restarted, jobs queued before that were lost.

**Redis errors that mention `OOM` or memory.**
Redis is full. With `noeviction` that's what it does instead of losing jobs. Move Redis to a bigger plan.

**The careers page takes a minute to load the first time.**
A Free service was asleep. Use a paid instance for anything candidates will see.

**Every applicant gets "too many requests".**
`TRUST_PROXY` is too low, so the API thinks they're all one visitor. Follow [Step 14](#step-14-check-the-api-sees-real-visitor-addresses).

**Emails don't arrive.**
Look at the API's logs at startup for an SMTP warning. Then check `MAIL_FROM` is on a domain verified with your provider.

More general problems are covered in [Troubleshooting](../getting-started/troubleshooting).
