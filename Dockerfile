# ============================================
# ClawOS API - Single Package Dockerfile
# ============================================

FROM node:20-alpine

WORKDIR /app

# Install system dependencies for Prisma
RUN apk add --no-cache openssl libc6-compat

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

# Build with verbose output
RUN echo "=== Starting TypeScript build ===" && \
    pnpm build && \
    echo "=== Build completed ===" && \
    ls -la dist/ && \
    echo "=== Routes folder ===" && \
    ls -la dist/routes/ 2>/dev/null || echo "No dist/routes folder!"

# Environment
ENV NODE_ENV=production
ENV PORT=3001

EXPOSE 3001

CMD ["node", "dist/index.js"]
