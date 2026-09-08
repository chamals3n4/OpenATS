---
sidebar_position: 2
title: Manual setup
---

Use this guide when you want to set up OpenATS one step at a time. It is the manual equivalent of the [Quick Start](make-setup) and the best way to find a setup problem.

## 1. Install prerequisites

Install Node.js 22 or later, pnpm, Docker with Docker Compose, `curl`, `jq`, and `openssl`. Create accounts for WSO2 Identity Platform, Cloudflare, Resend, Google Cloud, and Google AI Studio if you intend to enable every integration.

## 2. Download OpenATS and install packages

```sh
git clone https://github.com/chamals3n4/OpenATS.git
cd OpenATS
pnpm install
```

Install from the repository root. OpenATS uses pnpm workspaces, so this installs dependencies for both the frontend and backend with the committed versions.

## 3. Start PostgreSQL and Redis

```sh
docker compose up -d
```

PostgreSQL stores OpenATS data on port `5432`. Redis runs on port `6379` and is required by BullMQ, the background resume-analysis queue. Confirm both containers are running with `docker compose ps`.

## 4. Create environment files

```sh
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

Generate an encryption key and place it in `backend/.env`:

```sh
openssl rand -hex 32
```

Set `ENCRYPTION_KEY` to the output. Do not change it after storing encrypted integration credentials, or existing credentials cannot be decrypted.

Set these local values first:

```dotenv
# backend/.env
DATABASE_URL=postgresql://openats:openats@localhost:5432/openats
REDIS_URL=redis://localhost:6379
PORT=8080
FRONTEND_URL=http://localhost:3000

# frontend/.env
OPENATS_API_URL=http://localhost:8080
NEXT_PUBLIC_API_URL=http://localhost:8080
```

## 5. Configure WSO2 Identity Platform

Authentication is required before you can use most of OpenATS. Follow the full [WSO2 Identity Platform setup](../administration/iam-setup) guide. It explains the Next.js application, claims, API authorizations, roles, app-native authentication, and test user.

When finished, copy the frontend values (`NEXT_PUBLIC_ASGARDEO_BASE_URL`, client IDs, secrets, scopes, role IDs, and sign-in URL) into `frontend/.env`. Copy the JWKS URI and Issuer into `ASGARDEO_JWKS_URL` and `ASGARDEO_ISSUER` in `backend/.env`.

## 6. Configure resume storage with Cloudflare R2

R2 stores resumes and attachments. Open the [Cloudflare R2 dashboard](https://dash.cloudflare.com/?to=/:account/r2/overview) and select the Cloudflare account you will use for OpenATS.

1. Select **Create bucket** and give it a clear name, such as `openats-files`.
2. Keep the bucket private unless your product intentionally needs public resume URLs.
3. Return to **R2 Overview** and select **Manage** beside **API Tokens**.
4. Select **Create Account API Token** or **Create User API Token**.
5. Choose **Object Read & Write**, then restrict the token to the `openats-files` bucket where possible.
6. Create the token and immediately copy its **Access Key ID**, **Secret Access Key**, and **S3 API endpoint**. Cloudflare only shows the secret once.

Find the Cloudflare Account ID in the dashboard. The endpoint normally follows this format:

```dotenv
R2_ENDPOINT=https://<ACCOUNT_ID>.r2.cloudflarestorage.com
R2_ACCESS_KEY_ID=<Access Key ID>
R2_SECRET_ACCESS_KEY=<Secret Access Key>
R2_BUCKET_NAME=openats-files
R2_PUBLIC_URL=<public bucket URL, if you expose files publicly>
```

Set `R2_PUBLIC_URL` only when you have configured a public bucket domain. See [Cloudflare’s R2 S3 guide](https://developers.cloudflare.com/r2/get-started/s3/) if the dashboard labels differ.

## 7. Configure transactional email with Resend

Create a Resend account, add and verify a sending domain, then open **API Keys** and create a key. Choose **Sending access** and restrict it to the verified domain when possible. Copy the key immediately because it is shown only once.

```dotenv
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL=OpenATS <hiring@example.com>
```

The email address must use your verified Resend domain. Use a real monitored address for production notifications. See the [Resend API key guide](https://resend.com/docs/dashboard/api-keys/introduction).

## 8. Configure Gemini for resume analysis

Open [Google AI Studio](https://aistudio.google.com/app/apikey), create an API key for a Google Cloud project, and restrict it to the services and environments that need it. Add it only to the backend:

```dotenv
GEMINI_API_KEY=<your Gemini API key>
```

Keep the CV analysis worker running when this feature is enabled. Never expose this key through a `NEXT_PUBLIC_` variable.

## 9. Configure Google Calendar for interview scheduling

Open the [Google Cloud Console](https://console.cloud.google.com/), create a project called something like `OpenATS`, and select it from the project picker.

1. Open **APIs & Services** → **Library**, search for **Google Calendar API**, and select **Enable**.
2. Open **IAM & Admin** → **Service Accounts**, then select **Create service account**. Give it a name such as `openats-calendar` and finish creation.
3. Open the new service account, select the **Keys** tab, then choose **Add key** → **Create new key** → **JSON**. Download and store the JSON file safely; it is a secret.
4. Open [Google Calendar](https://calendar.google.com/). Create a dedicated OpenATS calendar, or choose a calendar that should hold interview events.
5. In that calendar, open **Settings and sharing** → **Share with specific people or groups**. Add the service-account email address, which ends in `iam.gserviceaccount.com`, and grant **Make changes to events** permission.
6. In **Settings and sharing** → **Integrate calendar**, copy the calendar ID.

Copy the entire downloaded JSON key into one line in `backend/.env`, and paste the calendar ID:

```dotenv
GOOGLE_SERVICE_ACCOUNT_JSON='{"type":"service_account",...}'
GOOGLE_CALENDAR_ID=your-calendar-id@group.calendar.google.com
GOOGLE_CALENDAR_ALLOW_ATTENDEES=false
```

Set `GOOGLE_CALENDAR_ALLOW_ATTENDEES=true` only when the service account has Domain-Wide Delegation. Without it, attendee invites are not sent. The optional `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET`, and `GOOGLE_OAUTH_REDIRECT_URI` are for OAuth-based calendar flows if your deployment uses them.

## 10. Create the database schema

```sh
cd backend
pnpm drizzle-kit migrate
pnpm tsx src/db/seed.ts
```

Migrations create the tables. Seeding adds the starting pipeline stages: Applied, Screening, Interviewed, Offer, and Rejected.

## 11. Start OpenATS

Open three terminals. In each terminal, start from the repository root.

**Terminal 1: API**

```sh
cd backend
pnpm dev
```

**Terminal 2: CV analysis worker**

```sh
cd backend
pnpm dev:worker
```

**Terminal 3: web application**

```sh
cd frontend
pnpm dev
```

Open `http://localhost:3000`, sign in as the WSO2 Super Admin test user, and create a test job. If a provider is not configured, leave its variables blank and do not use that feature until it is configured.

## 12. Verify before inviting users

Check that sign-in works, a job can be created, a resume can be uploaded, an email can be sent, and the CV worker is connected to Redis. Test each optional provider one at a time; this makes configuration problems much easier to isolate.
