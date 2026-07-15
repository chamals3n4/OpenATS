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

FROM base AS prod-deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile --prod

FROM deps AS build
COPY tsconfig.json drizzle.config.ts ./
COPY src ./src
RUN pnpm build

# drizzle-kit and tsx are devDependencies, so migrations and the seed script
# run from a stage that keeps them rather than from the runtime image.
FROM build AS migrator
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
