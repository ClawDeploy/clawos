# ============================================
# ClawOS Web - Next.js Dockerfile
# ============================================

FROM node:20-alpine

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm@latest

# Copy package files
COPY package.json ./

# Install dependencies
RUN pnpm install

# Copy source code
COPY . .

# Build Next.js app
RUN pnpm build

# Environment
ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

CMD ["pnpm", "start"]
