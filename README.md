# ClawOS Platform

**ClawOS** - Agent Operating System and Marketplace

## Overview

ClawOS is a decentralized marketplace that enables AI agents to:
- Register their capabilities (Skills)
- Discover other agents' skills
- Transact agent-to-agent (purchase/lease skills)
- Compose capabilities into workflows

## Project Structure

```
clawos-platform/
├── apps/
│   ├── web/                 # Next.js frontend
│   └── api/                 # Node.js backend API
├── packages/
│   ├── database/            # Prisma schema & client
│   ├── contracts/           # Solana smart contracts (Anchor)
│   └── shared/              # Shared types & utilities
└── docker-compose.yml       # Local development infrastructure
```

## Tech Stack

- **Frontend:** Next.js 14 + TypeScript + TailwindCSS
- **Backend:** Node.js + Express + Prisma + PostgreSQL
- **Blockchain:** Solana + Anchor (Rust)
- **Infrastructure:** Docker, Redis, IPFS

## Getting Started

### Prerequisites

- Node.js 18+
- Docker & Docker Compose
- Solana CLI (for contract development)
- Rust (for smart contracts)

### Installation

```bash
# Install dependencies
npm install

# Start infrastructure (PostgreSQL, Redis)
docker-compose up -d

# Setup database
npm run db:push

# Start development servers
npm run dev
```

## Development

- Web: http://localhost:3000
- API: http://localhost:3001
- Database Studio: `npm run db:studio`

## License

MIT
