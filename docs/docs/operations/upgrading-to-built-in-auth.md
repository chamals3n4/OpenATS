---
sidebar_position: 2
title: Upgrading to Built-In Sign-In
---

# Upgrading to Built-In Sign-In

Up to version 0.6, OpenATS signed people in through WSO2 Asgardeo. From **version 0.7**, sign-in is built into OpenATS and Asgardeo is no longer used.

This guide is for an installation that is **already running 0.6** with real users. A new installation does not need it: follow the [Quick Start](../getting-started/make-setup) instead.

## What changes, and what does not

| | |
| --- | --- |
| **Kept** | Every user, with the same internal id. Their jobs, candidates, notes, scorecards and history stay attached to them. |
| **Not kept: passwords** | Passwords lived in Asgardeo and **cannot be carried over**. Every user has to set a new password once. |
| **Not kept: roles** | Roles lived in Asgardeo too. After the upgrade **every user is an Interviewer** until you set their role again. |
| **No longer needed** | The Asgardeo tenant, its applications, and every `ASGARDEO_*` setting. |

:::caution Plan a short window
Between the upgrade and the moment people set their passwords, nobody can sign in. Tell your team beforehand, and do it at a quiet time.
:::

## Before you start

Write down who has which role today. You can see this in the Asgardeo console under **User Management → Roles**. You will need the list in step 6, because OpenATS cannot read it for you afterwards.

## Steps

### 1. Back up the database

Take a full backup of your PostgreSQL database and check that you can restore it. The upgrade changes the `users` table and removes a column, so this is your way back if something goes wrong.

### 2. Update the code

Deploy version 0.7 of both the API and the web application. Do not start them yet.

### 3. Update the settings

**In `backend/.env`:**

- Remove every `ASGARDEO_*` line.
- Add these two, using the public address of your web application:

  ```dotenv
  AUTH_JWKS_URL=https://ats.example.com/api/auth/jwks
  AUTH_ISSUER=https://ats.example.com
  ```

**In `frontend/.env`:**

- Remove every `ASGARDEO_*` and `NEXT_PUBLIC_ASGARDEO_*` line.
- Add these:

  ```dotenv
  DATABASE_URL=<the same value as in backend/.env>
  BETTER_AUTH_SECRET=<at least 32 characters: openssl rand -base64 32>
  BETTER_AUTH_URL=https://ats.example.com
  ```

- To let users reset their own password by email, also add `RESEND_API_KEY` and `RESEND_FROM_EMAIL`, with the same values as in `backend/.env`. This is strongly recommended for an upgrade, because every user needs a new password.

`AUTH_ISSUER` and `BETTER_AUTH_URL` must be exactly the same. The full list is in [Sign-in and users](../administration/authentication#settings-an-administrator-needs).

### 4. Run the database migrations

```sh
cd backend
pnpm drizzle-kit migrate
```

This adds the sign-in tables and the `role` column, and removes the old Asgardeo id column.

### 5. Give yourself access

Create a password for your own account and make it a Super Admin. Use the **same email** you already have in OpenATS, so that you keep your existing account:

```sh
make admin ARGS="--email you@example.com --first-name Your --last-name Name"
```

Because that email already exists, your account is updated rather than created again, and everything linked to it stays in place.

Now start the API and the web application, and sign in at `/login`.

### 6. Set everyone's role again

Open **Settings → User Management**. Every other user is listed as an **Interviewer**. Using the list you wrote down, edit each Hiring Manager and Super Admin and give them their role back.

### 7. Ask users to set a password

Each user needs a password before they can sign in. There are three ways:

| Way | When to use it |
| --- | --- |
| The user selects **Forgot password?** on the sign-in page | Simplest, if you set up email in step 3. Send everyone a short message asking them to do this. |
| You select **Send password reset link** for the user in User Management | When you want to prompt particular people. Also needs email. |
| You select **Set new password** for the user | When email is not set up. Pass the password on to them privately. |

### 8. Clean up

Once everyone can sign in, you can delete the OpenATS applications in your Asgardeo tenant, or the tenant itself. OpenATS no longer contacts it.

## If something goes wrong

**"Forgot password?" sends nothing for one user.** Sign-in looks emails up in lower case. A user whose email was stored with capital letters before the upgrade, such as `Ada@Example.com`, is not found. Check for them:

```sql
select id, email from users where email <> lower(email);
```

If any rows come back, change them to lower case. This stops with an error, and changes nothing, if two accounts would end up with the same email. In that case decide which account to keep before trying again:

```sql
update users set email = lower(email) where email <> lower(email);
```

**Every page says you are not signed in, although sign-in worked.** The API cannot reach `AUTH_JWKS_URL`, or `AUTH_ISSUER` does not match `BETTER_AUTH_URL` exactly. Check both.

**You are locked out.** Run `make admin` again with your email. It resets your password and makes you a Super Admin.

**You need to go back.** Stop both applications, restore the backup from step 1, and deploy version 0.6 with your old settings.
