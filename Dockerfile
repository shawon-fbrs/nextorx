# syntax=docker/dockerfile:1

# ─────────────────────────────────────────────────────────────────────
# NextOrx — single-process production image.
#
# Standard Next.js (standalone output). Runtime boot order:
#   prisma migrate deploy → seed (idempotent) → next start
#
# Deploy exactly ONE replica of this container.
# ─────────────────────────────────────────────────────────────────────

FROM node:22-slim AS base
ENV NEXT_TELEMETRY_DISABLED=1
# curl/wget are used by Coolify's built-in container healthcheck
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates curl \
  && rm -rf /var/lib/apt/lists/* \
  && npm install -g corepack --silent

# ── Dependencies ─────────────────────────────────────────────────────
FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
# The pnpm store lives in a BuildKit cache mount: it survives layer
# evictions, so a fresh build never re-downloads the full registry again.
RUN --mount=type=cache,target=/pnpm/store corepack enable \
  && pnpm install --frozen-lockfile --store-dir /pnpm/store \
     --fetch-retries 5 --fetch-retry-mintimeout 10000 \
     --fetch-retry-maxtimeout 300000 --fetch-timeout 900000

# ── Builder ──────────────────────────────────────────────────────────
FROM base AS builder
WORKDIR /app
ENV SKIP_ENV_VALIDATION=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# .next/cache is persisted via a cache mount, so `next build` recompiles
# only the files that actually changed on every deploy.
RUN --mount=type=cache,target=/app/.next/cache corepack enable \
  && npx prisma generate \
  && pnpm build

# ── Runner ───────────────────────────────────────────────────────────
FROM base AS runner
ENV NODE_ENV=production
ENV PORT=3000
RUN groupadd --system app && useradd --system --gid app app
WORKDIR /app
COPY --from=builder /app ./
RUN chown -R app:app .next
USER app
EXPOSE 3000
CMD ["sh", "-c", "node_modules/.bin/prisma db push --skip-generate && npx tsx scripts/seed.ts && node_modules/.bin/tsx server.ts"]
