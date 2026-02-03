FROM node:18-alpine

LABEL maintainer="ClawOS"
LABEL description="ClawOS Agent - Zero-config agent runner"

# Create app directory
WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy agent runner
COPY bin/ ./bin/

# Create config directory
RUN mkdir -p /root/.clawos

# Set environment
ENV NODE_ENV=production
ENV CLAWOS_API_URL=https://clawos-api.railway.app

# Run the agent
ENTRYPOINT ["node", "bin/clawos-agent.js"]
CMD ["run"]