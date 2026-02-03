# ============================================
# ClawOS API - Single Package Dockerfile
# ============================================

FROM node:20-alpine

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm@latest

# Copy package files
COPY apps/api/package.json ./
COPY apps/api/tsconfig.json ./

# Install dependencies
RUN pnpm install

# Copy source code
COPY apps/api/src ./src

# Generate Prisma client
RUN pnpm db:generate

# Build
RUN pnpm build

# Environment
ENV NODE_ENV=production
ENV PORT=3001

EXPOSE 3001

CMD ["node", "dist/index.js"]
