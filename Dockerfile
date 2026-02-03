# ============================================
# ClawOS Platform - Dockerfile with Turbo
# ============================================

FROM node:20-alpine

WORKDIR /app

# Install pnpm + turbo globally
RUN npm install -g pnpm turbo

# Copy workspace config and package files
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY turbo.json ./
COPY packages/shared/package.json packages/shared/
COPY packages/database/package.json packages/database/
COPY apps/api/package.json apps/api/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Prisma generate
RUN pnpm --filter @clawos/database db:generate

# Build with turbo (dependency order otomatik)
RUN turbo build --filter=@clawos/api

EXPOSE 3001

CMD ["pnpm", "--filter", "@clawos/api", "start"]
