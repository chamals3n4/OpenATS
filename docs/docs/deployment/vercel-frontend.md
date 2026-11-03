---
title: Deploy the Frontend on Vercel
sidebar_label: Frontend on Vercel
description: Run the OpenATS website (dashboard, careers page and sign-in) on Vercel, with the backend on Render or your own server. Project settings, environment variables, domain and the limits to know about.
keywords: [deploy OpenATS on Vercel, Next.js monorepo Vercel, pnpm workspace Vercel, OpenATS frontend hosting]
---

# Deploy the Frontend on Vercel

This guide puts the OpenATS **website** on [Vercel](https://vercel.com). That's the dashboard, the careers page and sign-in. The backend can't run on Vercel, because it keeps live connections open and runs a background worker all the time, so it stays on [Render](./render) or [your own server](./own-server).

**Jump to:** [Before you start](#before-you-start) · [Limits](#limits-to-know-about) · [Create the project](#step-2-create-the-project) · [Environment variables](#step-3-add-the-environment-variables) · [Region](#step-4-put-the-website-near-your-database) · [Domain](#step-6-add-your-domain) · [Point the backend at it](#step-7-point-the-backend-at-the-website) · [Check it works](#step-8-check-everything-works) · [Troubleshooting](#troubleshooting)

## Before you start

You need:

- [ ] **The backend running already**, with its public address (for example `https://api.example.com`) and `/health` showing `"status":"ok"`. On Render, that's Steps 1 to 11 of the [Render guide](./render). Skip its frontend step.
- [ ] **The database tables and your first admin created** ([Render guide, Step 8](./render#step-8-create-the-tables-and-your-first-admin)).
- [ ] **Your fork of OpenATS on GitHub.**
- [ ] **A Vercel account.** Running OpenATS for a business counts as commercial use, and Vercel's free Hobby plan is for personal, non-commercial use only. Use the **Pro** plan for real use.
- [ ] From your backend setup: the `DATABASE_URL`, `BETTER_AUTH_SECRET` and the email (SMTP) settings.

## Limits to know about

The website mostly runs fine on Vercel, but one thing works differently from Render or your own server:

- **Replacing a CV from the dashboard is limited to 4.5 MB.** Requests from the dashboard pass through the website on their way to the API, and Vercel refuses anything bigger than 4.5 MB with a `413` error. Candidates applying from the careers page aren't affected, because their CV goes straight to the API (up to 10 MB). Opening and viewing CVs isn't affected either.

## Step 1. Get a pooled database address

The website on Vercel runs as short-lived functions, and each one opens its own database connections. Neon's connection pooler is made for that.

1. In Neon, open your project and select **Connect**.
2. **Turn connection pooling on.** The host name now contains `-pooler`:

   ```text
   postgresql://neondb_owner:abc123@ep-cool-name-123456-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require
   ```

Use this one for Vercel only. The backend on Render keeps using the direct address, and database setup commands always use the direct one.

## Step 2. Create the project

1. In Vercel, select **Add New** > **Project** and import your fork.
2. Next to **Root Directory**, select **Edit** and choose **`frontend`**.
3. Vercel recognises it as **Next.js**. Leave the build, output and install commands as they are.
4. Don't deploy yet. Open **Environment Variables** first (next step). If you've already deployed, that's fine. It will fail, and you'll redeploy after Step 3.

Vercel finds the workspace and the lockfile at the top of the repository by itself, so the website builds even though its root directory is `frontend`.

## Step 3. Add the environment variables

Add each of these. Tick **Production** only. Preview deployments get a different address on every push, and sign-in only works on the one address in `BETTER_AUTH_URL`, so previews of the dashboard won't let you sign in anyway.

Mark the ones that say **Secret** as the Secret type, so nobody can read them back later.

| Variable | Example | Notes |
| --- | --- | --- |
| `DATABASE_URL` | `postgresql://...-pooler...neon.tech/neondb?sslmode=require` | **Secret.** The pooled address from Step 1 |
| `BETTER_AUTH_SECRET` | `Zp9...=` | **Secret.** Exactly the same value you used to create your admin |
| `BETTER_AUTH_URL` | `https://ats.example.com` | The website's own address. Must match `AUTH_ISSUER` on the backend |
| `NEXT_PUBLIC_APP_URL` | `https://ats.example.com` | Used in careers page links and link previews |
| `NEXT_PUBLIC_API_URL` | `https://api.example.com` | The backend's address |
| `OPENATS_API_URL` | `https://api.example.com` | The backend's address again |
| `SMTP_HOST` | `smtp.resend.com` | Same as the backend. Without it, invite and password reset emails aren't sent |
| `SMTP_PORT` | `465` | |
| `SMTP_SECURE` | `true` | `true` for 465, `false` for 587 |
| `SMTP_USER` | `resend` | |
| `SMTP_PASSWORD` | `re_xxxxxxxxx` | **Secret** |
| `MAIL_FROM` | `hiring@example.com` | |
| `MAIL_FROM_NAME` | `Example Careers` | Optional |
| `ENABLE_EXPERIMENTAL_COREPACK` | `1` | Makes Vercel use the exact pnpm version OpenATS asks for |

Leave `AUTH_TRUSTED_PROXIES` and the `NEXT_PUBLIC_DEMO_*` settings out.

If you don't have your own domain yet, use the address Vercel gives the project (`https://<project>.vercel.app`) for `BETTER_AUTH_URL` and `NEXT_PUBLIC_APP_URL`, and change them in Step 6.

**Changes to variables only apply to new deployments.** After you change any of them, go to **Deployments**, open the latest one and select **Redeploy**.

## Step 4. Put the website near your database

Vercel runs the website's server code in Washington, D.C. (`iad1`) unless you say otherwise. If your database and API are in Frankfurt, every page would cross the Atlantic several times.

Open **Settings** > **Functions** and set the **Function Region** to the one closest to your Neon database and your API. Then redeploy.

## Step 5. Deploy

Select **Deploy**, or **Redeploy** if you already did. When it's finished, open the address Vercel shows. You should see the OpenATS sign-in page.

## Step 6. Add your domain

1. Open **Settings** > **Domains** and add `ats.example.com`.
2. Vercel shows the DNS record to add. Add it at your DNS provider. If your DNS is on Cloudflare, set the record to **DNS only** (grey cloud).
3. Wait until Vercel shows the domain as valid. It sets up HTTPS for you.
4. If you used the `vercel.app` address in Step 3, change `BETTER_AUTH_URL` and `NEXT_PUBLIC_APP_URL` to `https://ats.example.com` and redeploy.

## Step 7. Point the backend at the website

The backend only accepts requests and sign-in tokens from the website's address, so tell it the new one. On Render these are in the `openats-backend` group (on your own server, in `backend/.env`):

| Variable | Value |
| --- | --- |
| `FRONTEND_URL` | `https://ats.example.com` |
| `AUTH_ISSUER` | `https://ats.example.com` |
| `AUTH_JWKS_URL` | `https://ats.example.com/api/auth/jwks` |

`AUTH_ISSUER` must match `BETTER_AUTH_URL` on Vercel character for character, with no slash at the end.

Save, and let the API and worker redeploy. If you had a website service on Render from before, you can now delete it, and the `openats-website` group with it.

## Step 8. Check everything works

1. Sign in at `https://ats.example.com`.
2. Open a candidate and view their CV.
3. Apply to a job from your careers page with a real PDF, and check the CV becomes readable within a few seconds.
4. Invite a test user and check the email arrives, with a link to your real address.
5. Open a job's team chat in two browser windows and send a message. It should appear in the other one by itself.

## Update to a new version

Update the backend first, as in the [Render guide](./render#update-to-a-new-version), including the database migration. Vercel builds the website from the same fork, so when you **Sync fork** on GitHub, Vercel deploys the new website at the same time. Vercel skips the build when nothing in the website changed.

## Troubleshooting

**The build fails with a pnpm version error.**
Check `ENABLE_EXPERIMENTAL_COREPACK` is set to `1`, then redeploy.

**The build can't find packages, or can't find `pnpm-lock.yaml`.**
Under **Settings** > **Build and Deployment** > **Root Directory**, make sure it's `frontend` and that **Include files outside the root directory in the Build Step** is on.

**Every page shows an error after deploying.**
Open **Logs** in Vercel. `Missing or invalid environment variables` means one of `DATABASE_URL`, `BETTER_AUTH_SECRET` or `BETTER_AUTH_URL` is missing or too short. `BETTER_AUTH_SECRET` needs at least 32 characters.

**You sign in and get sent straight back to the sign-in page.**
`BETTER_AUTH_URL` on Vercel and `AUTH_ISSUER` on the backend don't match, or you opened the site on a different address from `BETTER_AUTH_URL`. A `vercel.app` address and your own domain count as different addresses.

**Live updates don't work, and the browser console shows CORS or WebSocket errors.**
`FRONTEND_URL` on the backend isn't the website's exact address. Live updates connect from the browser straight to the API, which only accepts that one address.

**Replacing a CV from the dashboard fails with `413`.**
The file is over Vercel's 4.5 MB limit. See [Limits to know about](#limits-to-know-about). Ask the candidate for a smaller file, or run the website on Render instead.

**The database runs out of connections.**
You're using the direct database address. Switch `DATABASE_URL` on Vercel to the pooled one from Step 1 and redeploy.

More general problems are covered in [Troubleshooting](../getting-started/troubleshooting).
