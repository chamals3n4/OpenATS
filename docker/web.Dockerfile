# The OpenATS website: the dashboard, sign-in, the careers pages and the candidate pages.
# Every address and secret is read when the container starts, none when it is built, so one image
# works anywhere. Also holds scripts/create-admin.cjs for the setup step.
# Build from the repository root: docker build -f docker/web.Dockerfile .

FROM node:22-bookworm-slim AS base
ENV PNPM_HOME=/pnpm PATH=/pnpm:$PATH COREPACK_ENABLE_DOWNLOAD_PROMPT=0 \
    npm_config_fetch_retries=6 npm_config_fetch_retry_mintimeout=20000 npm_config_fetch_timeout=300000 NEXT_TELEMETRY_DISABLED=1
RUN corepack enable
WORKDIR /repo

FROM base AS build
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .pnpmfile.cjs ./
COPY backend/package.json backend/
COPY frontend/package.json frontend/
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile --filter ./frontend
COPY frontend frontend
# Placeholders so the build can load the sign-in code. Not kept: the real values are given when
# the container starts, and nothing here is a NEXT_PUBLIC_ value that would be baked in.
RUN NEXT_OUTPUT=standalone \
    DATABASE_URL=postgresql://build:build@localhost:5432/build \
    BETTER_AUTH_SECRET=build-time-placeholder-not-used-at-runtime \
    BETTER_AUTH_URL=http://localhost:3000 \
    pnpm --filter ./frontend build
# The admin script as one plain JavaScript file, so the slim image can run it without tsx.
RUN ESBUILD="$(find node_modules/.pnpm -path '*/node_modules/esbuild/bin/esbuild' | sort | tail -1)" \
 && "$ESBUILD" frontend/scripts/create-admin.ts --bundle --platform=node --target=node22 --format=cjs \
      --alias:@=./frontend --log-level=warning --outfile=frontend/.next/standalone/frontend/scripts/create-admin.cjs

FROM node:22-bookworm-slim
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0
WORKDIR /app
COPY --from=build --chown=node:node /repo/frontend/.next/standalone ./
COPY --from=build --chown=node:node /repo/frontend/.next/static ./frontend/.next/static
COPY --from=build --chown=node:node /repo/frontend/public ./frontend/public
USER node
EXPOSE 3000
CMD ["node", "frontend/server.js"]
