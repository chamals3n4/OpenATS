---
title: Try OpenATS with Docker
sidebar_label: Try with Docker
description: Run OpenATS on your own computer with one Docker command, with nothing to install or configure. Sign in, post a job, and see every email it sends.
keywords: [try OpenATS, OpenATS Docker, docker compose ATS, self-hosted applicant tracking system demo]
---

# Try OpenATS with Docker

The quickest way to see OpenATS working. One command starts everything on your computer: there's nothing to install apart from Docker, and no account to create anywhere.

You need [Docker Desktop](https://www.docker.com/products/docker-desktop/) or Docker Engine with Compose **2.34 or newer** (check with `docker compose version`).

## Start it

```bash
docker compose -f oci://ghcr.io/chamals3n4/openats-quickstart:latest up
```

The first start downloads the images and gets the database ready, which takes a minute or two. When it is ready you'll see:

```
OpenATS is starting at http://localhost:3000
Sign in with admin@example.com and the password: …
```

Open http://localhost:3000 and sign in with that email and password. If you missed them, `docker compose -p openats-quickstart logs admin` shows them again. Change the password in **Settings** once you are in.

## What is running

| Address | What it is |
|---|---|
| http://localhost:3000 | OpenATS: the dashboard and your careers page |
| http://localhost:8025 | Mailpit: every email OpenATS sends lands here, and nothing reaches a real inbox |
| http://localhost:8080 | The API the dashboard and careers page talk to |

Behind those are PostgreSQL, Redis and the background worker that reads CVs. Uploaded CVs and logos are kept in a Docker volume.

Everything is open on your own computer only, so nobody else on your network can reach it.

## Stop it, and start it again

Press `Ctrl+C`, or run `docker compose -p openats-quickstart down`. Your jobs, candidates and files are kept, and the same `up` command brings them back.

To start again from nothing, delete the data too:

```bash
docker compose -p openats-quickstart down --volumes
```

## Before using it for real

The quickstart is for trying OpenATS out. It has no HTTPS, it sends email only to Mailpit, and it is reachable on `localhost` only. To run OpenATS for your team, follow [Deploy to Production](./deployment.md).
