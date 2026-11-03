# The OpenATS API, background worker and database setup: one image, three commands.
#   API:     node dist/src/server.js   (the default)
#   Worker:  node dist/src/worker.js
#   Setup:   node dist/src/db/setup.js (migrations, then the default stages if there are none)
# Build from the repository root: docker build -f docker/backend.Dockerfile .

FROM node:22-bookworm-slim AS base
ENV PNPM_HOME=/pnpm PATH=/pnpm:$PATH COREPACK_ENABLE_DOWNLOAD_PROMPT=0 \
    npm_config_fetch_retries=6 npm_config_fetch_retry_mintimeout=20000 npm_config_fetch_timeout=300000
RUN corepack enable
WORKDIR /repo

FROM base AS build
# The lockfile and every workspace manifest first, so the install is cached until they change.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .pnpmfile.cjs ./
COPY backend/package.json backend/
COPY frontend/package.json frontend/
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile --filter ./backend
COPY backend backend
# deploy copies the package as `npm pack` would, which leaves out dist/ (it is in .gitignore),
# so the compiled code is copied in after it.
RUN pnpm --filter ./backend build \
 && pnpm --filter ./backend deploy --prod --legacy /out \
 && cp -r backend/dist /out/dist

FROM node:22-bookworm-slim
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build --chown=node:node /out ./
# Files when STORAGE=local. A new Docker volume mounted here takes this owner, so the app can write.
RUN mkdir -p /data/files && chown -R node:node /data
ENV STORAGE_DIR=/data/files
USER node
EXPOSE 8080
CMD ["node", "dist/src/server.js"]
