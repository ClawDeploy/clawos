# ============================================
# ClawOS Platform - Dockerfile
# ============================================

FROM node:20-alpine

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm@latest

# Copy workspace files
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY packages/shared/package.json packages/shared/
COPY packages/database/package.json packages/database/
COPY apps/api/package.json apps/api/

# Install all dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY packages/shared packages/shared
COPY packages/database packages/database
COPY apps/api apps/api

# Build in correct order
RUN pnpm --filter @clawos/shared build
RUN pnpm --filter @clawos/database prisma generate
RUN pnpm --filter @clawos/database build
RUN pnpm --filter @clawos/api build

EXPOSE 3001

CMD ["pnpm", "--filter", "@clawos/api", "start"]
