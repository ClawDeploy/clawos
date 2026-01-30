FROM node:22-slim

# Install Python and build tools for native modules
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy package files
COPY package.json pnpm-workspace.yaml ./
COPY apps/api/package.json ./apps/api/
COPY packages/database/package.json ./packages/database/
COPY packages/shared/package.json ./packages/shared/

# Install dependencies
RUN pnpm install

# Copy source code
COPY . .

# Build database package first
RUN pnpm --filter @clawos/database build

# Build shared package
RUN pnpm --filter @clawos/shared build

# Build API
RUN pnpm --filter @clawos/api build

# Expose port
EXPOSE 3001

# Start the API
CMD ["pnpm", "--filter", "@clawos/api", "start"]
