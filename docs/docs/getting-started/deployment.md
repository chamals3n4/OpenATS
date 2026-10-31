---
title: Deploy OpenATS to Production
sidebar_label: Deploy to Production
description: Run OpenATS on your own server. Set up the database, build the app, keep the API, worker and website running, and add HTTPS, backups and updates.
keywords: [deploy applicant tracking system, self-host OpenATS, ATS production setup, Nginx reverse proxy, PostgreSQL backup]
---

# Deploy OpenATS to Production

This guide puts OpenATS on a server so your team and candidates can reach it. It uses a single Linux server, which is plenty for most teams. If you haven't tried OpenATS yet, run it on your own computer with the [Quick Start](./make-setup) first.

There's no official Docker image for the app yet, so you'll build it from the source code.

## What you're setting up

OpenATS runs as **three programs**, and it needs all three:

| Program | What it does | Default port |
| --- | --- | --- |
| **Website** | The dashboard and careers page, plus sign-in | 3000 |
| **API** | The hiring logic and data access | 8080 |
| **Worker** | Background jobs, such as reading CVs | None |

They rely on these services:

| Service | Suggestions |
| --- | --- |
| **PostgreSQL** | A hosted database such as Neon, or your own install |
| **Redis** | A hosted Redis, or your own install |
| **File storage** | Cloudflare R2, with one public and one private bucket |
| **Email** | Any SMTP provider. Mailpit is only for testing |

Don't use the `docker-compose.yml` database password on a live server. It's a simple default for local use.

## 1. Get the server ready

You'll need Node.js 22, pnpm, Git, and a web server such as Nginx. Then point two addresses at your server. We'll use these throughout:

- `ats.example.com` for the website
- `api.example.com` for the API

## 2. Download and configure

```sh
git clone https://github.com/chamals3n4/OpenATS.git
cd OpenATS
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

Fill in both files. [Environment Variables](./environment-variables) explains every value, and [its last section](./environment-variables#addresses-that-must-match) shows how your addresses should line up.

Create your two secrets:

```sh
openssl rand -base64 32   # for ENCRYPTION_KEY in backend/.env
openssl rand -hex 32      # for BETTER_AUTH_SECRET in frontend/.env
```

Save both somewhere safe, like a password manager. You'll need the same values if you ever move servers.

Set `NEXT_PUBLIC_API_URL` and `NEXT_PUBLIC_APP_URL` **before** the next step, because they're built into the website.

## 3. Install and build

```sh
pnpm install --frozen-lockfile
pnpm build
```

## 4. Set up the database

```sh
cd backend
pnpm drizzle-kit migrate
pnpm tsx src/db/seed.ts
cd ..
```

The first command creates the tables. The second adds the default pipeline stages, and you only need it once.

There's no public sign-up, so create your first Super Admin:

```sh
make admin
```

## 5. Keep all three programs running

These are the commands to start each one:

```sh
cd backend && pnpm start          # the API
cd backend && pnpm start:worker   # the worker
cd frontend && pnpm start         # the website
```

They need to stay running and restart if the server reboots, so use a process manager such as PM2 or systemd. With PM2, for example:

```sh
pnpm add -g pm2
pm2 start "pnpm start" --name openats-api --cwd backend
pm2 start "pnpm start:worker" --name openats-worker --cwd backend
pm2 start "pnpm start" --name openats-web --cwd frontend
pm2 save
pm2 startup
```

**Don't skip the worker.** Without it, CVs stay on pending, CV search misses them, and deleted candidates' files are left in storage. Nothing shows an error except the warning in **Settings > General**.

If your host charges for a second service, set `RUN_WORKER_IN_API=true` in `backend/.env` and leave out the worker. The API then runs it in the same process. Don't do this if you're running the worker separately. On hosting that sleeps when idle, CVs wait until it wakes up.

## 6. Add HTTPS

Sign-in needs HTTPS, because secure cookies aren't sent over plain HTTP. Here's a starting point for Nginx. The `Upgrade` lines keep live updates working.

```nginx
server {
    server_name ats.example.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

server {
    server_name api.example.com;
    client_max_body_size 10m;

    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Then add a certificate, for example with Certbot:

```sh
sudo certbot --nginx -d ats.example.com -d api.example.com
```

## Tell the API about your proxy

Behind Nginx, every request seems to come from Nginx itself. If the API can't tell visitors apart, they all share one rate limit, and your careers page could start refusing applicants. `TRUST_PROXY` in `backend/.env` fixes this.

| Value | When to use it |
| --- | --- |
| `1` (the default) | One proxy in front, such as Nginx |
| `2`, `3`, ... | That many in a row, such as a CDN and then Nginx |
| `false` | Nothing in front of the API |
| `10.0.0.0/8,172.16.0.5` | Your proxies' addresses, if you'd rather name them |

`true` isn't allowed, because it would let visitors fake their address and get around the limits.

To check it's working, look at the API's request log. Each line starts with the visitor's address. If they all show `127.0.0.1`, `TRUST_PROXY` is too low or the header isn't arriving.

Limits are counted separately in each API process. If you run several copies, a visitor's real limit is the limit multiplied by the number of copies.

If the website itself sits behind more than one proxy, set `AUTH_TRUSTED_PROXIES` in `frontend/.env` so sign-in limits apply per person.

## 7. Check it all works

1. Open `https://api.example.com/health`. You want to see `"status":"ok"` and `"worker":"connected"`.
2. Sign in and finish [setting up your company](../using-openats/first-login-and-company-setup).
3. Create a job, publish it, and apply from your careers page with a real PDF.
4. Open that candidate. Their CV should be readable within a few seconds.
5. Invite a test user and check the email arrives, with a link to your real address.

Set up monitoring on `/health`. It fails if the database or Redis is down. A missing worker doesn't fail it, because restarting the API wouldn't help, so watch the `worker` field separately.

## Back up your data

Back up these, on a schedule, and try restoring them once so you know it works:

- **Your database.** This holds everything except files. Hosted providers usually do this for you. On your own server, use `pg_dump`:

  ```sh
  pg_dump "$DATABASE_URL" > openats-$(date +%F).sql
  ```

- **Your CV bucket.** Copy it elsewhere or turn on your provider's versioning.
- **Your two `.env` files.** Without `ENCRYPTION_KEY`, saved Google connections can't be read.

Old backups contain candidates you've since deleted, so remove them on a schedule. See [Delete Candidate Data](../administration/deleting-candidate-data).

## Update to a new version

Read the [release notes](https://github.com/chamals3n4/OpenATS/releases) first, since a version can include extra steps. Back up your database, then:

```sh
git pull
pnpm install --frozen-lockfile
pnpm build
cd backend && pnpm drizzle-kit migrate && cd ..
pm2 restart openats-api openats-worker openats-web
```

Always run the migration before restarting, so the new code doesn't start against an old database.

## Optional features

- **Google Calendar and Meet:** follow [these steps](./quick-start#9-connect-google-calendar-and-meet-optional), using your public API address for the redirect. People then connect their own accounts in **Settings > Integrations**.
- **AI CV analysis:** follow [these steps](./quick-start#8-set-up-ai-cv-analysis-optional). Remember this sends CVs to Google.

Each CV is read with a 30 second limit. A file that takes longer is marked as unreadable, so one bad PDF can't hold up the rest.

Something not working? Try [Troubleshooting](./troubleshooting).
