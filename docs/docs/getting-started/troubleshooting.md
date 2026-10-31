---
title: Troubleshooting Setup Problems
sidebar_label: Troubleshooting
description: Fix common OpenATS setup problems, including missing environment variables, ports in use, sign-in errors, and CVs stuck on pending.
keywords: [OpenATS troubleshooting, ATS setup errors, missing environment variables, background worker not running]
---

# Troubleshooting Setup Problems

Start by opening http://localhost:8080/health, or your API's `/health` address. It tells you which piece is having trouble:

```json
{"status":"ok","checks":{"db":"ok","redis":"ok"},"worker":"connected"}
```

If the page doesn't load at all, the API isn't running, so check the terminal for an error.

## "Missing or invalid environment variables"

The backend prints this when a setting is missing, and it lists each one. The most common cause on a new install is empty `R2_` values, because `make setup` can't fill those in. Add them as described in [Quick Start](./make-setup#3-add-your-file-storage-details).

If the website stops at start instead, check `DATABASE_URL`, `BETTER_AUTH_SECRET` and `BETTER_AUTH_URL` in `frontend/.env`. The secret needs at least 32 characters.

## A port is already in use

You'll see `EADDRINUSE` or a Docker error saying a port is allocated. Something else is using that port, often another copy of OpenATS or a PostgreSQL install on your machine.

To find out what's using it on Mac or Linux:

```sh
lsof -i :5432
```

Stop that program, then try again.

## The database connection fails

Check that Docker is running and the containers are up:

```sh
docker compose ps
```

If they're stopped, run `make infra-up`. Then give PostgreSQL a few seconds and try again.

## Tables are missing

An error such as `relation "users" does not exist` means the database hasn't been set up yet:

```sh
make migrate
make seed
```

## You can't sign in

- **Forgot your password, or locked out?** Run `make admin` and enter the same email to reset it.
- **Signed in, but the dashboard treats you as signed out?** The API can't check your session. Make sure `AUTH_ISSUER` exactly matches `BETTER_AUTH_URL`, including `http` or `https`, and that the API can reach `AUTH_JWKS_URL`.
- **Sign-in doesn't stick on a live server?** Your site needs HTTPS. Secure cookies aren't sent over plain HTTP.
- **Tried too many times?** Sign-in allows 5 attempts a minute. Wait a minute and try again.

## CVs stay on pending

The background worker isn't running. It's required, and it's what reads every CV. **Settings > General** shows a warning, and `/health` says `"worker":"missing"`.

`make dev` starts it for you. If you're running things by hand, start it with `pnpm dev:worker` in `backend/`, or `pnpm start:worker` in production.

## Uploads fail

Check every `R2_` value in `backend/.env`, and check that your storage token can read and write both buckets. Placeholder values let the app start, but real uploads won't work with them.

## Emails aren't arriving

**On your own computer,** look in Mailpit at http://localhost:8025. Emails don't go to real inboxes.

**On a live server,** check the API's startup log, which warns you if it can't log in to your mail server. Then make sure `MAIL_FROM` is an address your provider lets you send from, and that your domain has SPF and DKIM set up, otherwise your emails may land in spam.

Links in emails point to the wrong place? Set `FRONTEND_URL` in `backend/.env` to your public address.

## The careers page shows an error

The website can't reach the API. Check that the API is running and that `OPENATS_API_URL` is correct in `frontend/.env`.

## Google won't connect

The redirect address must match in two places: `GOOGLE_OAUTH_REDIRECT_URI` in `backend/.env`, and the **Authorised redirect URIs** on your Google client. While your Google app is in testing, only the accounts you've added as test users can connect.

## Still stuck?

[Open an issue on GitHub](https://github.com/chamals3n4/OpenATS/issues) with the command you ran and the full error message. Please remove any passwords or keys first.
