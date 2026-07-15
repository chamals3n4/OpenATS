# OpenATS backend.
#
# This one image runs three things, selected by the command:
#   node dist/src/server.js   API + Socket.IO   (default)
#   node dist/src/worker.js   CV analysis worker
#   pnpm drizzle-kit migrate  migrations (use the `migrator` target)
#
# Build from the backend/ directory:
#   docker build -t openats-backend backend/

ARG NODE_VERSION=22-alpine

FROM node:${NODE_VERSION} AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable
WORKDIR /app

# Dependencies are installed in their own stages so a source-only change
# does not invalidate the install layer.
FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

# Re-resolving with --prod on top of the deps stage prunes devDependencies
# while reusing the already-populated store, instead of downloading the whole
# tree a second time.
FROM deps AS prod-deps
RUN pnpm install --frozen-lockfile --prod --prefer-offline

FROM deps AS build
COPY tsconfig.json ./
COPY src ./src
RUN pnpm build

# drizzle-kit and tsx are devDependencies, so migrations and the seed script
# run from a stage that keeps them rather than from the runtime image.
# drizzle.config.ts lives here, not in `build`, so the runtime image doesn't
# ship a compiled copy of it (tsconfig.json includes it).
FROM build AS migrator
COPY drizzle.config.ts ./
COPY drizzle ./drizzle
CMD ["pnpm", "drizzle-kit", "migrate"]

FROM base AS runner
ENV NODE_ENV=production
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY package.json ./
# src/config/swagger.ts resolves this against process.cwd() at import time,
# so the server cannot boot without it.
COPY openapi.yaml ./
USER node
EXPOSE 8080
CMD ["node", "dist/src/server.js"]
