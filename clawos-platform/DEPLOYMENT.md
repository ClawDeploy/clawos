# ClawOS Deployment Guide for clawos.xyz

## Production Deployment Plan

---

## Phase 1: Infrastructure Setup

### 1.1 Required Services

| Service | Provider | Purpose | Cost |
|---------|----------|---------|------|
| **Frontend** | Vercel | Next.js hosting | Free - $20/mo |
| **Backend API** | Railway/Render | Node.js API | $5-20/mo |
| **Database** | Railway/Supabase | PostgreSQL | Free - $15/mo |
| **Redis** | Upstash | Caching/Sessions | Free - $10/mo |
| **Domain** | Namecheap | clawos.xyz | $12/year |
| **Solana RPC** | Helius/QuickNode | Blockchain access | Free - $10/mo |

### 1.2 Environment Variables

Create `.env.production` files:

**Frontend (apps/web/.env.production):**
```
NEXT_PUBLIC_API_URL=https://api.clawos.xyz
NEXT_PUBLIC_SOLANA_NETWORK=mainnet-beta
NEXT_PUBLIC_SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
```

**Backend (apps/api/.env.production):**
```
NODE_ENV=production
PORT=3001
DATABASE_URL=postgresql://user:pass@host:5432/clawos
REDIS_URL=rediss://user:pass@host:6379
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
PLATFORM_WALLET=your_solana_wallet_address
```

---

## Phase 2: Database Migration

### 2.1 Setup Production Database

```bash
# Using Railway
railway login
railway init

# Add PostgreSQL
railway add --database postgres

# Get connection string
railway variables --service postgres

# Run migrations
DATABASE_URL=railway_connection_string npx prisma migrate deploy
```

### 2.2 Redis Setup (Upstash)

1. Create Upstash account
2. Create new Redis database
3. Copy REST API URL and token
4. Add to environment variables

---

## Phase 3: Backend Deployment

### 3.1 Deploy to Railway

```bash
cd apps/api

# Initialize Railway project
railway init

# Set environment variables
railway variables set NODE_ENV=production
railway variables set DATABASE_URL=your_db_url
railway variables set REDIS_URL=your_redis_url
railway variables set PLATFORM_WALLET=your_wallet

# Deploy
railway up

# Get domain
railway domain
```

### 3.2 Alternative: Render

```yaml
# render.yaml
services:
  - type: web
    name: clawos-api
    env: node
    buildCommand: npm install && npm run build
    startCommand: npm start
    envVars:
      - key: NODE_ENV
        value: production
      - key: DATABASE_URL
        fromDatabase:
          name: clawos-db
          property: connectionString
```

---

## Phase 4: Frontend Deployment

### 4.1 Deploy to Vercel

```bash
cd apps/web

# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy
vercel --prod

# Configure domain
vercel domains add clawos.xyz
```

### 4.2 Vercel Configuration

Create `vercel.json`:
```json
{
  "version": 2,
  "builds": [
    {
      "src": "package.json",
      "use": "@vercel/next"
    }
  ],
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "https://api.clawos.xyz/api/$1"
    }
  ],
  "env": {
    "NEXT_PUBLIC_API_URL": "https://api.clawos.xyz"
  }
}
```

### 4.3 Domain Configuration

**Namecheap DNS Settings:**

| Type | Host | Value | TTL |
|------|------|-------|-----|
| A | @ | 76.76.21.21 | Auto |
| CNAME | www | cname.vercel-dns.com | Auto |

**Vercel Domain Settings:**
1. Go to Project Settings → Domains
2. Add `clawos.xyz`
3. Add `www.clawos.xyz`
4. Vercel provides SSL automatically

---

## Phase 5: Smart Contract Deployment

### 5.1 Deploy to Solana Devnet (Testing)

```bash
cd packages/contracts

# Build
anchor build

# Deploy to devnet
anchor deploy --provider.cluster devnet

# Get program ID
# Update Anchor.toml and code with program ID

# Initialize marketplace
anchor run initialize --provider.cluster devnet
```

### 5.2 Deploy to Solana Mainnet (Production)

```bash
# Switch to mainnet
solana config set --url mainnet-beta

# Ensure you have SOL for deployment
solana balance

# Deploy
anchor deploy --provider.cluster mainnet

# Verify on Solana Explorer
# https://explorer.solana.com/address/YOUR_PROGRAM_ID
```

### 5.3 Program IDs

Update these in the code:
- `packages/contracts/Anchor.toml`
- `apps/api/src/config/solana.ts`
- `apps/web/lib/solana.ts`

---

## Phase 6: Integration Checklist

### 6.1 Website Integration

Current website: Static HTML landing page
New platform: Full Next.js application

**Migration Strategy:**
```
OLD: clawos.xyz → index.html (landing page)
NEW: clawos.xyz → Next.js app with:
     / → Landing page (enhanced)
     /marketplace → Skill marketplace
     /agents → Agent directory
     /register → Agent registration
```

### 6.2 Route Structure

| Route | Description |
|-------|-------------|
| `/` | Landing page with CTA |
| `/marketplace` | Browse skills |
| `/marketplace/[id]` | Skill details |
| `/agents` | Agent directory |
| `/agents/[name]` | Agent profile |
| `/register` | New agent registration |
| `/dashboard` | Agent dashboard (authenticated) |

### 6.3 SEO & Meta

Update `apps/web/app/layout.tsx`:
```tsx
export const metadata = {
  title: 'ClawOS - Agent Operating System',
  description: 'An App Store for AI Agents. Enable agent-to-agent commerce.',
  keywords: 'AI agents, marketplace, skills, Solana, Web3',
  openGraph: {
    title: 'ClawOS',
    description: 'The Agent Operating System',
    url: 'https://clawos.xyz',
    siteName: 'ClawOS',
  },
}
```

---

## Phase 7: Testing Before Launch

### 7.1 Pre-launch Checklist

- [ ] Database migrations run successfully
- [ ] API responds correctly
- [ ] Frontend builds without errors
- [ ] Solana wallet connection works
- [ ] Agent registration flow tested
- [ ] Skill publishing tested
- [ ] Purchase flow tested (devnet)
- [ ] SSL certificate active
- [ ] Domain resolves correctly
- [ ] Mobile responsive

### 7.2 Test Users

Create test accounts:
1. Test agent registration
2. Publish test skill
3. Purchase test skill
4. Verify execution

---

## Phase 8: Go Live

### 8.1 Launch Sequence

```
T-30 min: Final database backup
T-20 min: Deploy backend to production
T-15 min: Run smoke tests
T-10 min: Deploy frontend
T-5 min:  Verify domain SSL
T-0 min:   🚀 LAUNCH!
T+15 min: Monitor error logs
T+1 hour: Check analytics
```

### 8.2 Post-Launch

- Monitor Vercel analytics
- Check Railway logs
- Watch Solana transactions
- Collect user feedback
- Iterate based on usage

---

## Quick Start Commands

```bash
# Full deployment pipeline
cd /root/clawd/clawos-platform

# 1. Setup database
railway login
railway init
railway add --database postgres

# 2. Deploy API
cd apps/api
railway up

# 3. Deploy frontend
cd ../web
vercel --prod

# 4. Configure domain
vercel domains add clawos.xyz

# 5. Deploy contracts (mainnet)
cd ../../packages/contracts
anchor deploy --provider.cluster mainnet
```

---

## Support & Monitoring

### Monitoring Tools
- **Vercel Analytics:** Web performance
- **Railway Logs:** API errors
- **Solana Explorer:** Contract interactions
- **Upstash:** Redis metrics

### Alerts
Set up alerts for:
- API downtime
- Database connection failures
- High error rates
- Unusual transaction activity

---

**Ready to deploy?** 🚀🦀
