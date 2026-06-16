# OpenATS Deployment Guide

This guide covers every supported deployment topology. Pick the one that fits your infrastructure.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [External Services Setup (required for all scenarios)](#external-services-setup)
3. [Scenario A — Frontend on Vercel + Backend on a VM](#scenario-a--frontend-on-vercel--backend-on-a-vm)
4. [Scenario B — Everything on a VM with Docker Compose](#scenario-b--everything-on-a-vm-with-docker-compose)
5. [Scenario C — Both on Cloud PaaS (no VM at all)](#scenario-c--both-on-cloud-paas-no-vm-at-all)
6. [Post-Deployment: Database Migrations & Seeding](#post-deployment-database-migrations--seeding)
7. [SSL / HTTPS with Nginx](#ssl--https-with-nginx)
8. [Environment Variable Reference](#environment-variable-reference)
9. [Troubleshooting](#troubleshooting)

---

## Architecture Overview

```
                        ┌─────────────────────┐
                        │   WSO2 Asgardeo     │  (identity provider — cloud)
                        └──────────┬──────────┘
                                   │  JWT / OAuth
          ┌────────────────────────▼──────────────────────────┐
          │                   Frontend (Next.js)               │
          │                   port 3000                        │
          └────────────────────────┬──────────────────────────┘
                                   │  HTTP + WebSocket
          ┌────────────────────────▼──────────────────────────┐
          │                   Backend (Express + Socket.io)    │
          │                   port 8080                        │
          └────────────────────────┬──────────────────────────┘
                                   │
          ┌────────────────────────▼──────────────────────────┐
          │               PostgreSQL database                  │
          └───────────────────────────────────────────────────┘

External services used by the backend:
  - Cloudflare R2 / AWS S3  — file/resume storage
  - Resend                  — transactional email
  - Google Gemini API       — AI-assisted screening
  - Google Calendar API     — interview scheduling
```

---

## External Services Setup

These must be configured **before** any deployment scenario. None of them require a VM.

### 1. WSO2 Asgardeo (Authentication)

OpenATS uses Asgardeo as its identity provider. You need a free Asgardeo organisation.

1. Sign up at https://asgardeo.io and create an organisation (e.g. `openats`).
2. In the Asgardeo console → **Applications** → **New Application** → choose **Traditional Web Application**.
   - Name it `OpenATS Frontend`
   - Set **Allowed redirect URLs**: `https://yourdomain.com/api/auth/callback/asgardeo`
   - Set **Allowed origins**: `https://yourdomain.com`
   - Note your **Client ID** and **Client Secret**
3. Create a second application of type **Standard-Based Application (OIDC)** named `OpenATS Backend`.
   - Note its **Client ID** (used only for token validation — no secret needed on the backend).
   - Under **Protocol** → copy the **JWKS URI** and **Issuer** URL. These look like:
     - JWKS: `https://api.asgardeo.io/t/<org>/oauth2/jwks`
     - Issuer: `https://api.asgardeo.io/t/<org>/oauth2/token`
4. Create three **User Roles** in Asgardeo: `super_admin`, `hiring_manager`, `interviewer`.
   - Copy each role's **ID** (shown in the URL when you open the role) — you'll need them as env vars.
5. In the frontend application's **User Attributes**, enable the `roles` claim so it appears in the JWT.

### 2. Cloudflare R2 (File Storage)

1. Sign up at https://cloudflare.com and go to **R2 Object Storage**.
2. Create a bucket (e.g. `openats-files`).
3. Under **Manage R2 API Tokens** create a token with **Object Read & Write** permissions scoped to your bucket.
4. Note: `R2_ENDPOINT`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`.
5. Enable **Public Access** on the bucket to get `R2_PUBLIC_URL` (e.g. `https://pub-xxxx.r2.dev`).

> Alternatively any S3-compatible storage (AWS S3, MinIO, etc.) works — the env var names remain the same.

### 3. Resend (Email)

1. Sign up at https://resend.com and verify your sending domain.
2. Generate an API key. Set `RESEND_API_KEY` and `RESEND_FROM_EMAIL=noreply@yourdomain.com`.

### 4. Google Gemini API

1. Go to https://aistudio.google.com → **Get API key**.
2. Set `GEMINI_API_KEY`.

### 5. Google Calendar (optional — for interview scheduling)

1. In Google Cloud Console, create a project and enable the **Google Calendar API**.
2. Create an **OAuth 2.0 Client ID** (web application type).
   - Set redirect URI to `https://api.yourdomain.com/api/google/callback`
   - Copy `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`.
3. Create a **Service Account**, download the JSON key, and base64-encode it:
   ```bash
   base64 -w 0 service-account.json
   ```
   Set `GOOGLE_SERVICE_ACCOUNT_JSON` to the base64 string.
4. Share your calendar with the service account email and set `GOOGLE_CALENDAR_ID`.

---

## Scenario A — Frontend on Vercel + Backend on a VM

**Best for:** teams that want zero-config frontend hosting and a single backend VM.

```
Internet → Vercel (frontend, CDN-distributed)
         → VM: Nginx → Backend (port 8080)
                     → PostgreSQL (same VM or external managed DB)
```

### Step 1 — Provision the VM

Any Linux VM works (Ubuntu 22.04 LTS recommended). Minimum specs: 1 vCPU, 1 GB RAM.

```bash
# On a fresh Ubuntu 22.04 VM
sudo apt-get update && sudo apt-get upgrade -y

# Install Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
# Log out and back in so the group takes effect
```

### Step 2 — Create the Backend Dockerfile

Create `backend/Dockerfile`:

```dockerfile
# ---- deps stage ----
FROM node:22-alpine AS deps
RUN corepack enable && corepack prepare pnpm@10.20.0 --activate
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# ---- build stage ----
FROM node:22-alpine AS builder
RUN corepack enable && corepack prepare pnpm@10.20.0 --activate
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm build

# ---- production image ----
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
# Copy compiled output
COPY --from=builder /app/dist ./dist
# Copy production node_modules (reuse from deps stage — already pruned by pnpm)
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
# Copy Drizzle migration files so migrations can run inside the container
COPY --from=builder /app/drizzle ./drizzle
EXPOSE 8080
CMD ["node", "dist/src/server.js"]
```

Create `backend/.dockerignore`:

```
node_modules
dist
.env
*.log
```

### Step 3 — Create the backend environment file on the VM

SSH into your VM and create `/opt/openats/backend.env`:

```bash
sudo mkdir -p /opt/openats
sudo nano /opt/openats/backend.env
```

Paste (fill in your values):

```env
DATABASE_URL=postgresql://openats:STRONG_PASSWORD@localhost:5432/openats
PORT=8080
FRONTEND_URL=https://your-app.vercel.app

ASGARDEO_JWKS_URL=https://api.asgardeo.io/t/<org>/oauth2/jwks
ASGARDEO_ISSUER=https://api.asgardeo.io/t/<org>/oauth2/token

R2_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com
R2_ACCESS_KEY_ID=your-r2-key-id
R2_SECRET_ACCESS_KEY=your-r2-secret
R2_BUCKET_NAME=openats-files
R2_PUBLIC_URL=https://pub-xxxx.r2.dev

RESEND_API_KEY=re_xxxxxxxxxxxx
RESEND_FROM_EMAIL=noreply@yourdomain.com

GEMINI_API_KEY=AIzaxxxxxxxxxxxx

GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=https://api.yourdomain.com/api/google/callback
GOOGLE_SERVICE_ACCOUNT_JSON=<base64-encoded-service-account-json>
GOOGLE_CALENDAR_ID=primary
```

```bash
sudo chmod 600 /opt/openats/backend.env
```

### Step 4 — Run PostgreSQL and the Backend with Docker

```bash
# Create a Docker network so containers talk to each other
docker network create openats

# Start PostgreSQL
docker run -d \
  --name openats-db \
  --network openats \
  -e POSTGRES_DB=openats \
  -e POSTGRES_USER=openats \
  -e POSTGRES_PASSWORD=STRONG_PASSWORD \
  -v openats-pgdata:/var/lib/postgresql/data \
  --restart unless-stopped \
  postgres:16-alpine

# Build and start the backend (from the repo root on your VM)
git clone https://github.com/your-org/OpenATS.git /opt/openats/repo
cd /opt/openats/repo/backend

docker build -t openats-backend .

docker run -d \
  --name openats-backend \
  --network openats \
  -p 8080:8080 \
  --env-file /opt/openats/backend.env \
  -e DATABASE_URL=postgresql://openats:STRONG_PASSWORD@openats-db:5432/openats \
  --restart unless-stopped \
  openats-backend
```

> Notice `DATABASE_URL` is overridden here to use the container name `openats-db` as the host. The `--env-file` sets everything else.

### Step 5 — Run Migrations and Seed

```bash
# Run migrations inside the running container
docker exec -it openats-backend sh -c "
  cd /app && \
  node -e \"
    const { drizzle } = require('drizzle-orm/node-postgres');
    const { migrate } = require('drizzle-orm/node-postgres/migrator');
    const { Pool } = require('pg');
    require('dotenv/config');
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const db = drizzle(pool);
    migrate(db, { migrationsFolder: './drizzle' })
      .then(() => { console.log('Migrations done'); pool.end(); })
      .catch(e => { console.error(e); pool.end(); process.exit(1); });
  \"
"

# Seed default pipeline stages (required — app won't work without these)
# Run this from the backend directory on the VM (needs DB access)
docker exec -it openats-backend sh -c "node -r tsx/cjs /app/src/db/seed.ts" 2>/dev/null || \
  echo "Note: seed.ts uses tsx — run via pnpm tsx src/db/seed.ts from the host instead"
```

**Alternative — seed from the host** (easier):

```bash
cd /opt/openats/repo/backend
cp /opt/openats/backend.env .env
# Override DATABASE_URL to point to localhost since we mapped no host port for DB
# Add this line to .env: DATABASE_URL=postgresql://openats:STRONG_PASSWORD@localhost:5432/openats
# But we didn't expose the DB port... expose it temporarily:
docker run -d --name openats-db-temp -p 5432:5432 ... # not ideal

# Easier: run seed inside container with tsx installed
docker exec openats-backend sh -c "cd /app && npx tsx src/db/seed.ts"
```

> The cleanest approach is to expose the DB port temporarily for migration, then remove the port binding. Or use the Docker Compose approach in Scenario B which handles this automatically.

### Step 6 — Install Nginx and get SSL

```bash
sudo apt-get install -y nginx certbot python3-certbot-nginx

# Create Nginx config
sudo nano /etc/nginx/sites-available/openats-api
```

Paste:

```nginx
server {
    listen 80;
    server_name api.yourdomain.com;

    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 86400;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/openats-api /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx

# Get SSL certificate
sudo certbot --nginx -d api.yourdomain.com
```

### Step 7 — Deploy the Frontend to Vercel

1. Push your repo to GitHub.
2. Go to https://vercel.com → **New Project** → import your repo.
3. Set **Root Directory** to `frontend`.
4. Add all environment variables in Vercel's dashboard (Project → Settings → Environment Variables):

```
NEXT_PUBLIC_ASGARDEO_BASE_URL     = https://api.asgardeo.io/t/<org>
NEXT_PUBLIC_ASGARDEO_CLIENT_ID    = <frontend-app-client-id>
NEXT_PUBLIC_ASGARDEO_SCOPES       = openid profile email offline_access internal_role_mgt_delete internal_role_mgt_groups_update internal_role_mgt_meta_create internal_role_mgt_meta_update internal_role_mgt_users_update internal_role_mgt_view internal_user_mgt_create internal_user_mgt_delete internal_user_mgt_list internal_user_mgt_update internal_user_mgt_view
NEXT_PUBLIC_ASGARDEO_SIGN_IN_URL  = https://your-app.vercel.app/sign-in
NEXT_PUBLIC_API_URL               = https://api.yourdomain.com

ASGARDEO_CLIENT_ID                = <frontend-app-client-id>
ASGARDEO_CLIENT_SECRET            = <frontend-app-client-secret>
ASGARDEO_SECRET                   = <random-32-char-string>  # openssl rand -hex 32

ASGARDEO_SUPER_ADMIN_ROLE_ID      = <role-id-from-asgardeo>
ASGARDEO_HIRING_MANAGER_ROLE_ID   = <role-id-from-asgardeo>
ASGARDEO_INTERVIEWER_ROLE_ID      = <role-id-from-asgardeo>

OPENATS_API_URL                   = https://api.yourdomain.com
```

5. Click **Deploy**.

### Step 8 — Update CORS on the backend

Update `FRONTEND_URL` in `/opt/openats/backend.env` to your final Vercel production URL (e.g. `https://your-app.vercel.app`) and restart the container:

```bash
docker restart openats-backend
```

---

## Scenario B — Everything on a VM with Docker Compose

**Best for:** self-hosted teams who want everything in one place with simple `docker compose up`.

```
Internet → Nginx (port 80/443)
              ├── Frontend container (port 3000)
              └── Backend container (port 8080)
                      └── PostgreSQL container
```

### Step 1 — Prepare the frontend for Docker (standalone output)

Add `output: 'standalone'` to `frontend/next.config.ts`. This tells Next.js to bundle only what's needed to run the server — the resulting image is ~10× smaller.

```ts
// frontend/next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",      // <-- add this line
  experimental: {
    optimizePackageImports: [
      "@hugeicons/react",
      "@hugeicons/core-free-icons",
      "lucide-react",
      "recharts",
      "date-fns",
      "@tiptap/react",
      "@tiptap/starter-kit",
      "react-pdf",
      "react-dnd",
      "react-dnd-html5-backend",
      "socket.io-client",
    ],
  },
  compiler: {
    removeConsole:
      process.env.NODE_ENV === "production"
        ? { exclude: ["error", "warn"] }
        : false,
  },
  images: {
    formats: ["image/avif", "image/webp"],
  },
};

export default nextConfig;
```

### Step 2 — Create `frontend/Dockerfile`

```dockerfile
# ---- deps stage ----
FROM node:22-alpine AS deps
RUN corepack enable && corepack prepare pnpm@10.20.0 --activate
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# ---- build stage ----
FROM node:22-alpine AS builder
RUN corepack enable && corepack prepare pnpm@10.20.0 --activate
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# NEXT_PUBLIC_* vars must be available at BUILD TIME (they get baked into the JS bundle)
ARG NEXT_PUBLIC_ASGARDEO_BASE_URL
ARG NEXT_PUBLIC_ASGARDEO_CLIENT_ID
ARG NEXT_PUBLIC_ASGARDEO_SCOPES
ARG NEXT_PUBLIC_ASGARDEO_SIGN_IN_URL
ARG NEXT_PUBLIC_API_URL

ENV NEXT_PUBLIC_ASGARDEO_BASE_URL=$NEXT_PUBLIC_ASGARDEO_BASE_URL
ENV NEXT_PUBLIC_ASGARDEO_CLIENT_ID=$NEXT_PUBLIC_ASGARDEO_CLIENT_ID
ENV NEXT_PUBLIC_ASGARDEO_SCOPES=$NEXT_PUBLIC_ASGARDEO_SCOPES
ENV NEXT_PUBLIC_ASGARDEO_SIGN_IN_URL=$NEXT_PUBLIC_ASGARDEO_SIGN_IN_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NODE_ENV=production

RUN pnpm build

# ---- production image ----
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# Standalone output includes a minimal server.js + required node_modules
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
```

Create `frontend/.dockerignore`:

```
node_modules
.next
.env*
*.log
```

### Step 3 — Create `backend/Dockerfile`

(Same as Scenario A — copy it from there.)

### Step 4 — Create `docker-compose.yml` at the repo root

```yaml
services:

  # ──────────────── Database ────────────────
  db:
    image: postgres:16-alpine
    container_name: openats-db
    environment:
      POSTGRES_DB: openats
      POSTGRES_USER: openats
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U openats -d openats"]
      interval: 5s
      timeout: 5s
      retries: 10
    restart: unless-stopped

  # ──────────────── Backend ────────────────
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: openats-backend
    env_file:
      - ./backend/.env
    environment:
      # Override DATABASE_URL to use the container name as host
      DATABASE_URL: postgresql://openats:${POSTGRES_PASSWORD}@db:5432/openats
      PORT: "8080"
      FRONTEND_URL: ${FRONTEND_URL}
    depends_on:
      db:
        condition: service_healthy
    restart: unless-stopped
    # Don't expose 8080 to the internet — Nginx handles that
    expose:
      - "8080"

  # ──────────────── Frontend ────────────────
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
      args:
        NEXT_PUBLIC_ASGARDEO_BASE_URL: ${NEXT_PUBLIC_ASGARDEO_BASE_URL}
        NEXT_PUBLIC_ASGARDEO_CLIENT_ID: ${NEXT_PUBLIC_ASGARDEO_CLIENT_ID}
        NEXT_PUBLIC_ASGARDEO_SCOPES: ${NEXT_PUBLIC_ASGARDEO_SCOPES}
        NEXT_PUBLIC_ASGARDEO_SIGN_IN_URL: ${NEXT_PUBLIC_ASGARDEO_SIGN_IN_URL}
        NEXT_PUBLIC_API_URL: ${NEXT_PUBLIC_API_URL}
    container_name: openats-frontend
    env_file:
      - ./frontend/.env
    environment:
      # Server-side: frontend talks to backend over the internal Docker network
      OPENATS_API_URL: http://backend:8080
    depends_on:
      - backend
    restart: unless-stopped
    expose:
      - "3000"

  # ──────────────── Nginx reverse proxy ────────────────
  nginx:
    image: nginx:1.27-alpine
    container_name: openats-nginx
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./nginx/ssl:/etc/nginx/ssl:ro        # TLS certs go here
    depends_on:
      - frontend
      - backend
    restart: unless-stopped

volumes:
  postgres_data:
```

### Step 5 — Create `.env` at the repo root

This file feeds docker-compose variable substitution. **Do not commit it.**

```env
# ── Postgres ──
POSTGRES_PASSWORD=use-a-long-random-string-here

# ── URLs ──
FRONTEND_URL=https://yourdomain.com
NEXT_PUBLIC_API_URL=https://yourdomain.com/api

# ── Asgardeo (public — baked into the frontend bundle at build time) ──
NEXT_PUBLIC_ASGARDEO_BASE_URL=https://api.asgardeo.io/t/<org>
NEXT_PUBLIC_ASGARDEO_CLIENT_ID=<frontend-app-client-id>
NEXT_PUBLIC_ASGARDEO_SCOPES=openid profile email offline_access internal_role_mgt_delete internal_role_mgt_groups_update internal_role_mgt_meta_create internal_role_mgt_meta_update internal_role_mgt_users_update internal_role_mgt_view internal_user_mgt_create internal_user_mgt_delete internal_user_mgt_list internal_user_mgt_update internal_user_mgt_view
NEXT_PUBLIC_ASGARDEO_SIGN_IN_URL=https://yourdomain.com/sign-in
```

### Step 6 — Create `backend/.env` and `frontend/.env`

**`backend/.env`** (secrets — not in docker-compose root env):

```env
ASGARDEO_JWKS_URL=https://api.asgardeo.io/t/<org>/oauth2/jwks
ASGARDEO_ISSUER=https://api.asgardeo.io/t/<org>/oauth2/token

R2_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com
R2_ACCESS_KEY_ID=your-key-id
R2_SECRET_ACCESS_KEY=your-secret
R2_BUCKET_NAME=openats-files
R2_PUBLIC_URL=https://pub-xxxx.r2.dev

RESEND_API_KEY=re_xxxxxxxxxxxx
RESEND_FROM_EMAIL=noreply@yourdomain.com

GEMINI_API_KEY=AIzaxxxxxxxxxxxx

GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=https://yourdomain.com/api/google/callback
GOOGLE_SERVICE_ACCOUNT_JSON=<base64-encoded-json>
GOOGLE_CALENDAR_ID=primary
```

**`frontend/.env`** (server-side secrets — NOT prefixed with NEXT_PUBLIC_):

```env
ASGARDEO_CLIENT_ID=<frontend-app-client-id>
ASGARDEO_CLIENT_SECRET=<frontend-app-client-secret>
ASGARDEO_SECRET=<run: openssl rand -hex 32>

ASGARDEO_SUPER_ADMIN_ROLE_ID=<role-id>
ASGARDEO_HIRING_MANAGER_ROLE_ID=<role-id>
ASGARDEO_INTERVIEWER_ROLE_ID=<role-id>
```

### Step 7 — Create `nginx/nginx.conf`

In this scenario the frontend and backend are served from the same domain. The backend API is proxied under `/api` and `/public` paths, and `/socket.io` handles WebSocket upgrades.

```nginx
events {
    worker_connections 1024;
}

http {
    # Redirect all HTTP to HTTPS
    server {
        listen 80;
        server_name yourdomain.com;
        return 301 https://$host$request_uri;
    }

    server {
        listen 443 ssl;
        server_name yourdomain.com;

        ssl_certificate     /etc/nginx/ssl/fullchain.pem;
        ssl_certificate_key /etc/nginx/ssl/privkey.pem;
        ssl_protocols       TLSv1.2 TLSv1.3;
        ssl_ciphers         HIGH:!aNULL:!MD5;

        client_max_body_size 50M;

        # ── Backend API ──────────────────────────────────────
        location /api/ {
            proxy_pass http://backend:8080/api/;
            proxy_http_version 1.1;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        # ── Public (token-auth) routes ───────────────────────
        location /public/ {
            proxy_pass http://backend:8080/public/;
            proxy_http_version 1.1;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        # ── Backend health check ─────────────────────────────
        location /health {
            proxy_pass http://backend:8080/health;
        }

        # ── Swagger docs ─────────────────────────────────────
        location /api-docs {
            proxy_pass http://backend:8080/api-docs;
            proxy_set_header Host $host;
        }

        # ── WebSocket (Socket.io) ────────────────────────────
        location /socket.io/ {
            proxy_pass http://backend:8080/socket.io/;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "upgrade";
            proxy_set_header Host $host;
            proxy_read_timeout 86400;
        }

        # ── Frontend (everything else) ───────────────────────
        location / {
            proxy_pass http://frontend:3000;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "upgrade";
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
    }
}
```

> **SSL certificates**: Place `fullchain.pem` and `privkey.pem` in `nginx/ssl/`. Get them via Certbot on the host:
> ```bash
> sudo apt-get install -y certbot
> sudo certbot certonly --standalone -d yourdomain.com
> sudo cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem nginx/ssl/
> sudo cp /etc/letsencrypt/live/yourdomain.com/privkey.pem nginx/ssl/
> ```

### Step 8 — Deploy

```bash
# On the VM — clone and go
git clone https://github.com/your-org/OpenATS.git
cd OpenATS

# Fill in the env files (see above)
cp .env.example .env   # or create manually

# Build and start everything
docker compose up -d --build

# Watch logs
docker compose logs -f
```

### Step 9 — Run Migrations and Seed (first deploy only)

```bash
# Run DB migrations
docker compose exec backend node -e "
const { drizzle } = require('drizzle-orm/node-postgres');
const { migrate } = require('drizzle-orm/node-postgres/migrator');
const { Pool } = require('pg');
require('dotenv/config');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool);
migrate(db, { migrationsFolder: './drizzle' })
  .then(() => { console.log('Migrations complete'); pool.end(); })
  .catch(e => { console.error(e); pool.end(); process.exit(1); });
"

# Seed the 5 default pipeline stages (Required — do this once)
docker compose exec backend npx tsx src/db/seed.ts
```

### Updating after a code change

```bash
git pull
docker compose up -d --build
```

Docker Compose will only rebuild changed images and restart those containers.

---

## Scenario C — Both on Cloud PaaS (no VM at all)

**Best for:** solo developers or small teams who don't want to manage servers.

```
Vercel         — frontend
Railway / Fly.io / Render — backend
Neon / Supabase / Railway DB — PostgreSQL
```

### Option C-1: Frontend on Vercel + Backend on Railway

**Backend on Railway:**

1. Go to https://railway.app → **New Project** → **Deploy from GitHub repo**.
2. Select the repo and set the **Root Directory** to `backend`.
3. Railway auto-detects Node.js. Set the **Start Command**:
   ```
   pnpm build && node dist/src/server.js
   ```
   Or set in `railway.toml` (create at `backend/railway.toml`):
   ```toml
   [build]
   builder = "NIXPACKS"
   buildCommand = "pnpm install --frozen-lockfile && pnpm build"

   [deploy]
   startCommand = "node dist/src/server.js"
   healthcheckPath = "/health"
   ```
4. Add a **PostgreSQL** plugin from the Railway dashboard. Railway sets `DATABASE_URL` automatically.
5. Add all other backend environment variables in the Railway dashboard.
6. Railway gives you a URL like `https://openats-backend.up.railway.app`. Use this as `NEXT_PUBLIC_API_URL` in Vercel.

**Frontend on Vercel** — follow Step 7 from Scenario A.

### Option C-2: Frontend on Vercel + Backend on Fly.io

Create `backend/fly.toml`:

```toml
app = "openats-backend"
primary_region = "iad"   # change to your preferred region

[build]
  dockerfile = "Dockerfile"

[http_service]
  internal_port = 8080
  force_https = true
  auto_stop_machines = true
  auto_start_machines = true
  min_machines_running = 0

  [http_service.concurrency]
    type = "connections"
    hard_limit = 25
    soft_limit = 20

[[vm]]
  memory = "1gb"
  cpu_kind = "shared"
  cpus = 1
```

```bash
# Install flyctl: https://fly.io/docs/hands-on/install-flyctl/
cd backend
fly launch --no-deploy   # creates app
fly postgres create      # creates managed PG, links automatically
fly secrets set \
  ASGARDEO_JWKS_URL="..." \
  ASGARDEO_ISSUER="..." \
  R2_ENDPOINT="..." \
  # ... (all env vars)
fly deploy
```

### Option C-3: Frontend on Vercel + Backend on Render

1. Go to https://render.com → **New Web Service** → connect GitHub → select the repo.
2. Set **Root Directory** to `backend`.
3. Set **Build Command**: `pnpm install --frozen-lockfile && pnpm build`
4. Set **Start Command**: `node dist/src/server.js`
5. Add all environment variables.
6. Add a **PostgreSQL** database from the Render dashboard and copy the connection string to `DATABASE_URL`.

---

## Post-Deployment: Database Migrations & Seeding

These steps apply to **every scenario** on first deploy, and migrations must be re-run after any schema change.

### Running migrations

The Drizzle migration files live in `backend/drizzle/`. They must be applied to the database.

**If you have shell access to the backend container:**

```bash
# Docker Compose
docker compose exec backend node -e "
const { drizzle } = require('drizzle-orm/node-postgres');
const { migrate } = require('drizzle-orm/node-postgres/migrator');
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool);
migrate(db, { migrationsFolder: './drizzle' })
  .then(() => { console.log('done'); pool.end(); })
  .catch(e => { console.error(e); pool.end(); process.exit(1); });
"
```

**If you only have the DATABASE_URL (e.g. managed cloud DB):**

```bash
# Run from the backend directory on your local machine
DATABASE_URL="postgresql://..." pnpm drizzle-kit migrate
```

### Seeding pipeline stages

The app requires 5 default pipeline stages (Applied, Screening, Interviewed, Offer, Rejected). Run the seed once:

```bash
# Via Docker Compose
docker compose exec backend npx tsx src/db/seed.ts

# Via Railway / Render / Fly.io (connect to a one-off shell)
railway run pnpm tsx src/db/seed.ts
fly ssh console -C "cd /app && npx tsx src/db/seed.ts"
```

---

## SSL / HTTPS with Nginx

For Scenario A (backend-only VM) or Scenario B (full VM):

```bash
# Install Certbot
sudo apt-get install -y certbot python3-certbot-nginx   # Scenario A (Nginx on host)
# OR for Scenario B, get certs before starting compose and mount them:
sudo certbot certonly --standalone -d yourdomain.com    # stops port 80 temporarily

# Auto-renewal (runs twice daily via systemd timer — already installed by certbot)
sudo systemctl status certbot.timer

# After renewal, copy new certs into nginx/ssl/ and reload nginx:
sudo cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem nginx/ssl/
sudo cp /etc/letsencrypt/live/yourdomain.com/privkey.pem nginx/ssl/
docker compose exec nginx nginx -s reload
```

---

## Environment Variable Reference

### Backend

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `PORT` | No | Server port (default: 8080) |
| `FRONTEND_URL` | Yes | Frontend origin for CORS (e.g. `https://yourdomain.com`) |
| `ASGARDEO_JWKS_URL` | Yes | Asgardeo JWKS endpoint for JWT verification |
| `ASGARDEO_ISSUER` | Yes | Asgardeo token issuer URL |
| `R2_ENDPOINT` | Yes | Cloudflare R2 / S3 endpoint |
| `R2_ACCESS_KEY_ID` | Yes | Storage access key |
| `R2_SECRET_ACCESS_KEY` | Yes | Storage secret key |
| `R2_BUCKET_NAME` | Yes | Storage bucket name |
| `R2_PUBLIC_URL` | Yes | Public base URL for stored files |
| `RESEND_API_KEY` | Yes | Resend email API key |
| `RESEND_FROM_EMAIL` | Yes | Sender email address |
| `GEMINI_API_KEY` | Yes | Google Gemini API key |
| `GOOGLE_CLIENT_ID` | No | Google OAuth client ID (Calendar feature) |
| `GOOGLE_CLIENT_SECRET` | No | Google OAuth client secret (Calendar feature) |
| `GOOGLE_REDIRECT_URI` | No | Google OAuth redirect URI |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | No | Base64-encoded service account JSON |
| `GOOGLE_CALENDAR_ID` | No | Google Calendar ID |

### Frontend

| Variable | Required | Build-time? | Description |
|---|---|---|---|
| `NEXT_PUBLIC_ASGARDEO_BASE_URL` | Yes | Yes | Asgardeo org base URL |
| `NEXT_PUBLIC_ASGARDEO_CLIENT_ID` | Yes | Yes | Frontend app client ID |
| `NEXT_PUBLIC_ASGARDEO_SCOPES` | Yes | Yes | OAuth scopes (space-separated) |
| `NEXT_PUBLIC_ASGARDEO_SIGN_IN_URL` | Yes | Yes | Sign-in page URL |
| `NEXT_PUBLIC_API_URL` | Yes | Yes | Public backend URL (browser uses this) |
| `ASGARDEO_CLIENT_ID` | Yes | No | Same as NEXT_PUBLIC version (server-side) |
| `ASGARDEO_CLIENT_SECRET` | Yes | No | Frontend app OAuth client secret |
| `ASGARDEO_SECRET` | Yes | No | Random secret for session encryption (`openssl rand -hex 32`) |
| `ASGARDEO_SUPER_ADMIN_ROLE_ID` | Yes | No | Asgardeo role ID for super_admin |
| `ASGARDEO_HIRING_MANAGER_ROLE_ID` | Yes | No | Asgardeo role ID for hiring_manager |
| `ASGARDEO_INTERVIEWER_ROLE_ID` | Yes | No | Asgardeo role ID for interviewer |
| `OPENATS_API_URL` | Yes | No | Internal backend URL (server-side only, e.g. `http://backend:8080`) |

> **Important**: `NEXT_PUBLIC_*` variables are embedded into the JavaScript bundle at build time. If you change them, you must rebuild the frontend image. Non-prefixed variables are read at server startup and can be changed without rebuilding.

---

## Troubleshooting

### CORS errors in the browser

The backend validates origins dynamically. Ensure `FRONTEND_URL` on the backend exactly matches the origin the browser sends (no trailing slash, correct protocol). Check `app.ts` for the `normalizeOrigin` function — it strips trailing slashes.

### WebSocket connection fails

Socket.io requires the `Upgrade` header to pass through Nginx. Verify your Nginx config includes:
```nginx
proxy_set_header Upgrade $http_upgrade;
proxy_set_header Connection "upgrade";
proxy_read_timeout 86400;
```

### JWT verification fails (401 on all API calls)

- Verify `ASGARDEO_JWKS_URL` and `ASGARDEO_ISSUER` match your Asgardeo organisation exactly.
- The JWKS URL format is: `https://api.asgardeo.io/t/<your-org-name>/oauth2/jwks`
- Check that the frontend app's allowed origins include your deployed frontend URL.

### Database connection refused

In Docker Compose, the backend uses the service name `db` as the hostname. If you override `DATABASE_URL` in the compose file, ensure the host is the service name (`db`), not `localhost`.

### Migrations fail ("relation does not exist")

Drizzle migrations are ordered and cumulative. Always run `pnpm drizzle-kit generate` after any schema change and commit the generated SQL files before deploying.

### Frontend build fails with "NEXT_PUBLIC_ variable is undefined"

These variables must be present as Docker build args (not just runtime env vars). In the Dockerfile, they are declared as `ARG` and then set as `ENV` before `RUN pnpm build`. In Docker Compose, pass them under `build.args`.

### `force-dynamic` and Vercel

The root layout sets `export const dynamic = "force-dynamic"` which disables static generation for the entire app. This is expected — Vercel handles it via serverless functions automatically. No special configuration needed.
