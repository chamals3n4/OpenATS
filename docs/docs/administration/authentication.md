---
sidebar_position: 1
title: Sign-In and Users
---

# Sign-In and Users

OpenATS handles sign-in itself. There is no outside identity service to create an account with or configure: users, passwords, roles and sessions all live in your own OpenATS database.

This page explains how people sign in, how accounts are created, what each role can do, and the settings an administrator needs.

## How sign-in works

- People sign in with an **email address and a password** at `/login`.
- There is **no public sign-up**. Nobody can create their own account. A Super Admin creates every user.
- A signed-in session lasts **7 days without use**. Each visit pushes that forward, so people who use OpenATS regularly stay signed in.
- Sign-in is limited to **5 attempts a minute** for each person, to slow down password guessing.

## The first account

A fresh installation has no users, so the first Super Admin is created from the command line:

```sh
make admin
```

It asks for an email, a first name, a last name and a password. The password is not shown while you type and is never printed. `make setup` runs this step for you at the end.

To skip the questions, pass the values:

```sh
make admin ARGS="--email ada@example.com --first-name Ada --last-name Lovelace"
```

You are still asked for the password, so that it does not end up in your shell history.

:::tip Locked out?
`make admin` is also the way back in. Run it with the email of an **existing** user and it makes that user a Super Admin, reactivates the account, sets the new password and signs out any old sessions. Nothing else about the user changes, so their jobs, notes and history stay as they are.
:::

## Roles

Every user has exactly one role.

| Role | What they can do |
| --- | --- |
| **Super Admin** | Everything, including creating users, changing roles and deactivating accounts, and the company profile, departments and AI analysis setting. |
| **Hiring Manager** | Run hiring on their own jobs: create jobs, and on the jobs they are on the hiring team of edit the job, move candidates through the pipeline, schedule interviews and make offers. They also manage what all jobs share: assessments, assignments, email templates and the careers page. They see the company settings read-only. |
| **Interviewer** | Take part in the jobs they are on the hiring team for: read those candidates and submit interview scorecards. |

A role change takes effect on the user's **next request**. They do not need to sign out and in again.

### Who sees which jobs

A job's **hiring team** decides what a Hiring Manager and an Interviewer see. Whoever creates a job is added to its hiring team.

| Role | Jobs and candidates they can see |
| --- | --- |
| **Super Admin** | Every job and every candidate. |
| **Hiring Manager** | Only the jobs they are on the hiring team for, and the candidates of those jobs, and they can change them. Other jobs, and their candidates, offers, interviews and report figures, do not appear at all. |
| **Interviewer** | Only the jobs they are on the hiring team for, and the candidates of those jobs. A link to any other candidate answers "no access". They also see any interview they were picked to run, even on a job they are not on the team of. They never see the **Manage Offers** page or salaries there, and cannot accept or decline an offer. |

The **team chat** follows the same rule: a job's chat, and the chat on each of its candidates, is open only to that job's hiring team and to Super Admins.

Picking someone to run an interview does not add them to the job's hiring team. They can see that interview and submit its scorecard, but to open the candidate's page and CV they have to be on the hiring team as well.

To let a Hiring Manager work on a job they did not create, add them to that job's hiring team.

## Managing users

Open **Settings → User Management**. Only Super Admins see this page.

### Create a user

1. Select **Create User**.
2. Enter the email, first name and last name, and choose a role.
3. Choose how the password is set:

| Option | What happens |
| --- | --- |
| **Invite the user to set their own password** | They receive an email with a link to choose a password. The link works once and expires after 24 hours. |
| **Set a password for the user** | You type a password and pass it on to them yourself. |

The invite option needs email to be configured (see [Email for invites and resets](#email-for-invites-and-resets)). Without it, the option is greyed out and you set the password yourself.

### Change a user

From the list you can edit a user's name, email and role, and manage their password:

| Action | What it does |
| --- | --- |
| **Send password reset link** | Emails the user a link to choose a new password. |
| **Set new password** | You choose the password. The user is signed out everywhere and must use the new one. |
| **Remove** | Deactivates the account (see below). |

### Removing a user

Removing a user **deactivates** the account. They are signed out and cannot sign in again, and it takes effect immediately. The user is **never deleted**, so the jobs they created, their notes and their scorecards stay in place with their name on them.

To bring someone back, create a user with the **same email**. That restores their existing account instead of making a new one.

Two safeguards stop you from locking everyone out:

- You cannot deactivate your own account or change your own role.
- You cannot remove or demote the **last active Super Admin**. Make someone else a Super Admin first.

## Forgotten passwords

A user who has forgotten their password selects **Forgot password?** on the sign-in page and enters their email.

- If the email belongs to an account, a reset link is sent. The page shows the same message either way, so nobody can use it to find out which emails have accounts.
- The link works **once** and expires after **24 hours**.
- Choosing a new password signs the user out of every other session.
- Passwords must be **8 to 128 characters**.
- Reset requests are limited to **3 every 5 minutes**.

A Super Admin can also send a reset link, or set a password directly, from **Settings → User Management**.

## Settings an administrator needs

Sign-in runs inside the web application (the `frontend` package). The API (the `backend` package) checks who is signed in on every request.

### Web application: `frontend/.env`

| Variable | Required | What it is for |
| --- | --- | --- |
| `DATABASE_URL` | Yes | The same database the API uses. Sign-in reads and writes its tables there. |
| `BETTER_AUTH_SECRET` | Yes | A secret of at least 32 characters that protects sessions. Generate one with `openssl rand -base64 32`. Keep it private, set it once and keep it: changing it later invalidates existing sign-ins. |
| `BETTER_AUTH_URL` | Yes | The public address of the web application, for example `https://ats.example.com`. |
| `AUTH_TRUSTED_PROXIES` | No | The addresses of proxies in front of the app, when requests pass through more than one. Needed so sign-in limits apply per person rather than to everyone at once. |
| `RESEND_API_KEY`, `RESEND_FROM_EMAIL` | No | Sends invite and reset emails. See below. |

The web application refuses to start, with a clear message, if a required value is missing or the secret is too short.

### API: `backend/.env`

| Variable | Required | What it is for |
| --- | --- | --- |
| `AUTH_JWKS_URL` | Yes | Where the API fetches the keys it uses to check a sign-in. It is the web application's address followed by `/api/auth/jwks`. |
| `AUTH_ISSUER` | Yes | Must be **exactly the same** as `BETTER_AUTH_URL`. |

:::caution The API must be able to reach the web application
The API downloads the keys from `AUTH_JWKS_URL`. If the API server cannot open that address, every request is rejected as not signed in. Check this first if sign-in works but every page then fails to load data.
:::

`make setup` fills in `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL` and `DATABASE_URL` for local development. The example files already hold the right local values for the two API variables.

### Email for invites and resets

Invite and reset emails are sent through [Resend](https://resend.com). Set these in `frontend/.env`, using the same values as in `backend/.env`:

```dotenv
RESEND_API_KEY=<your Resend API key>
RESEND_FROM_EMAIL=<an address on a domain you verified in Resend>
```

Without them, OpenATS still works:

| | What happens |
| --- | --- |
| **In development** | No email is sent. The link is printed in the terminal running the web application, so you can copy it. |
| **In production** | No email is sent and the link is not shown anywhere, because the link is as good as a password. Set the two values, or have a Super Admin set passwords by hand. |

## For developers

- Sign-in is built with [Better Auth](https://www.better-auth.com), running in the Next.js server.
- The web application issues a short-lived token (15 minutes) for each request to the API. The API checks it against the public keys at `/api/auth/jwks`.
- The token only says **who** the user is. Their role, and whether they are active, are read from the database on every request. That is why a role change or a deactivation applies at once.
- All database changes, including the sign-in tables (named `auth_*`), are ordinary migrations in `backend/drizzle`.

Upgrading an installation that used WSO2 Asgardeo? See [Upgrading to built-in sign-in](../operations/upgrading-to-built-in-auth).
