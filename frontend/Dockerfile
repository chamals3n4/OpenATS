# OpenATS frontend (Next.js standalone output).
#
# Build from the frontend/ directory:
#   docker build -t openats-frontend frontend/
#
# NEXT_PUBLIC_* values are inlined into the client bundle by `next build`, so
# they are build args, not runtime env. Changing one means rebuilding the
# image. Server-only secrets (ASGARDEO_CLIENT_SECRET and friends) are read at
# runtime and must NOT be passed here — a build arg would be baked into the
# image layers.

ARG NODE_VERSION=22-alpine

FROM node:${NODE_VERSION} AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
ENV NEXT_TELEMETRY_DISABLED=1
RUN corepack enable
WORKDIR /app

FROM base AS deps
# Some of Next's native deps expect glibc symbols on Alpine.
RUN apk add --no-cache libc6-compat
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_APP_URL
ARG NEXT_PUBLIC_ASGARDEO_BASE_URL
ARG NEXT_PUBLIC_ASGARDEO_CLIENT_ID
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
ENV NEXT_PUBLIC_APP_URL=${NEXT_PUBLIC_APP_URL}
ENV NEXT_PUBLIC_ASGARDEO_BASE_URL=${NEXT_PUBLIC_ASGARDEO_BASE_URL}
ENV NEXT_PUBLIC_ASGARDEO_CLIENT_ID=${NEXT_PUBLIC_ASGARDEO_CLIENT_ID}

# `next build` downloads the next/font/google fonts used by app/layout.tsx,
# so this stage needs network access.
RUN pnpm build

FROM base AS runner
ENV NODE_ENV=production
ENV PORT=3000
# Without this the standalone server binds to localhost and is unreachable
# from outside the container.
ENV HOSTNAME=0.0.0.0

# next/image writes optimized assets into .next/cache at runtime.
RUN mkdir -p .next && chown node:node .next

COPY --from=build --chown=node:node /app/public ./public
COPY --from=build --chown=node:node /app/.next/standalone ./
COPY --from=build --chown=node:node /app/.next/static ./.next/static

USER node
EXPOSE 3000
CMD ["node", "server.js"]
