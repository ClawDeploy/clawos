# ============================================
# ClawOS Platform - Dockerfile
# ============================================

FROM node:20-slim

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
ENV NODE_ENV=production
ENV PORT=3001

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Package files
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/database/package.json ./packages/database/
COPY packages/database/prisma ./packages/database/prisma/
COPY apps/api/package.json ./apps/api/

# Install deps
RUN pnpm install --frozen-lockfile

# Prisma generate
RUN cd packages/database && pnpm prisma generate

# Source code
COPY . .

# Build in dependency order
RUN pnpm --filter @clawos/shared build && \
    pnpm --filter @clawos/database build && \
    pnpm --filter @clawos/api build

EXPOSE 3001

CMD ["node", "apps/api/dist/index.js"]
