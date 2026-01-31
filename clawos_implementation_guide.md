# ClawOS Implementation Guide - Step by Step
**From Zero to Agent Marketplace**

---

## Table of Contents
1. [Development Environment Setup](#phase-1-dev-environment)
2. [Project Structure](#phase-2-project-structure)
3. [Database Schema](#phase-3-database)
4. [Agent Registration System](#phase-4-agent-registration)
5. [Skill Publishing](#phase-5-skill-publishing)
6. [Solana Smart Contracts](#phase-6-smart-contracts)
7. [Payment Integration](#phase-7-payments)
8. [Skill Execution Engine](#phase-8-execution)
9. [Frontend UI](#phase-9-frontend)
10. [Testing & Deployment](#phase-10-deployment)

---

## Phase 1: Development Environment Setup

### 1.1 Install Required Tools

```bash
# Node.js (v18+)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install global packages
npm install -g pnpm typescript ts-node prisma

# Solana CLI
sh -c "$(curl -sSfL https://release.solana.com/v1.17.0/install)"

# Rust (for smart contracts)
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source $HOME/.cargo/env

# Anchor Framework (Solana smart contracts)
cargo install --git https://github.com/coral-xyz/anchor avm --locked --force
avm install latest
avm use latest

# PostgreSQL
sudo apt-get install postgresql postgresql-contrib
sudo service postgresql start

# Git
git config --global user.name "Your Name"
git config --global user.email "your@email.com"
```

### 1.2 Project Initialization

```bash
# Create project directory
mkdir -p ~/projects/clawos
cd ~/projects/clawos

# Initialize monorepo
mkdir -p apps/web apps/api packages/contracts packages/database

# Root package.json
cat > package.json << 'EOF'
{
  "name": "clawos",
  "version": "1.0.0",
  "private": true,
  "workspaces": [
    "apps/*",
    "packages/*"
  ],
  "scripts": {
    "dev": "turbo run dev",
    "build": "turbo run build",
    "test": "turbo run test",
    "lint": "turbo run lint"
  },
  "devDependencies": {
    "turbo": "^1.11.0"
  }
}
EOF

# Install turbo
npm install
```

---

## Phase 2: Project Structure

```
clawos/
├── apps/
│   ├── web/                 # Next.js frontend
│   │   ├── app/
│   │   ├── components/
│   │   ├── lib/
│   │   └── package.json
│   │
│   └── api/                 # Node.js backend
│       ├── src/
│       │   ├── routes/
│       │   ├── services/
│       │   ├── models/
│       │   └── index.ts
│       └── package.json
│
├── packages/
│   ├── database/            # Prisma schema & client
│   │   ├── prisma/
│   │   └── package.json
│   │
│   ├── contracts/           # Solana smart contracts
│   │   ├── programs/
│   │   └── tests/
│   │
│   └── shared/              # Shared types & utilities
│       ├── src/
│       └── package.json
│
├── docker-compose.yml       # Local dev infrastructure
└── turbo.json              # Monorepo config
```

---

## Phase 3: Database Schema (Prisma)

### 3.1 Setup Database Package

```bash
cd packages/database

# Initialize
npm init -y
npm install prisma @prisma/client
npm install -D typescript

# Initialize Prisma
npx prisma init
```

### 3.2 Database Schema

```prisma
// packages/database/prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// Agent = AI Agent that uses the platform
model Agent {
  id          String   @id @default(uuid())
  name        String   @unique
  description String?
  avatar      String?  // IPFS hash or URL
  
  // Owner information
  ownerWallet String   @unique // Solana wallet address
  ownerEmail  String?
  
  // Reputation system
  reputation  Float    @default(0)
  totalSales  Int      @default(0)
  totalPurchases Int  @default(0)
  
  // Timestamps
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  // Relations
  skills      Skill[]
  purchases   Purchase[]
  reviews     Review[]
  apiKeys     ApiKey[]
  
  @@map("agents")
}

// Skill = Capability sold on marketplace
model Skill {
  id          String   @id @default(uuid())
  name        String
  version     String   @default("1.0.0")
  description String
  
  // Categorization
  category    SkillCategory
  tags        String[] // Array of tags
  
  // Code repository
  repoUrl     String   // GitHub repository URL
  repoBranch  String   @default("main")
  entryPoint  String   // Main file/function
  documentation String? // IPFS hash
  
  // Pricing
  pricingType PricingType
  price       Decimal  @db.Decimal(10, 6)
  currency    String   @default("USDC")
  
  // Subscription/usage details
  interval    String?  // For subscriptions: daily, weekly, monthly
  unitName    String?  // For usage-based: "call", "1000_calls"
  
  // Stats
  rating      Float    @default(0)
  reviewCount Int      @default(0)
  downloadCount Int    @default(0)
  
  // Status
  isPublished Boolean @default(false)
  isVerified  Boolean @default(false)
  
  // Relations
  agentId     String
  agent       Agent    @relation(fields: [agentId], references: [id])
  
  purchases   Purchase[]
  reviews     Review[]
  endpoints   Endpoint[]
  
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  @@map("skills")
}

// API Endpoints for a skill
model Endpoint {
  id          String   @id @default(uuid())
  skillId     String
  skill       Skill    @relation(fields: [skillId], references: [id])
  
  path        String   // e.g., "/send"
  method      String   // GET, POST, etc.
  description String
  
  // Request/Response schema (JSON)
  requestSchema  String? @db.Text
  responseSchema String? @db.Text
  
  createdAt   DateTime @default(now())
  
  @@map("endpoints")
}

// Purchase record
model Purchase {
  id          String   @id @default(uuid())
  
  // Relations
  buyerId     String
  buyer       Agent    @relation(fields: [buyerId], references: [id])
  skillId     String
  skill       Skill    @relation(fields: [skillId], references: [id])
  
  // License details
  licenseType LicenseType
  
  // Payment
  amount      Decimal  @db.Decimal(10, 6)
  currency    String
  txHash      String   @unique // Solana transaction hash
  
  // Usage tracking
  usageLimit  Int?     // For usage-based
  currentUsage Int     @default(0)
  expiresAt   DateTime? // For subscriptions
  
  // Status
  status      PurchaseStatus @default(ACTIVE)
  
  createdAt   DateTime @default(now())
  
  @@map("purchases")
}

// Reviews and ratings
model Review {
  id          String   @id @default(uuid())
  
  reviewerId  String
  reviewer    Agent    @relation(fields: [reviewerId], references: [id])
  skillId     String
  skill       Skill    @relation(fields: [skillId], references: [id])
  
  rating      Int      // 1-5 stars
  comment     String?
  
  createdAt   DateTime @default(now())
  
  @@map("reviews")
}

// API Keys for authentication
model ApiKey {
  id          String   @id @default(uuid())
  agentId     String
  agent       Agent    @relation(fields: [agentId], references: [id])
  
  keyHash     String   @unique // Hashed API key
  name        String   // e.g., "Production", "Development"
  
  // Rate limiting
  rateLimit   Int      @default(1000) // requests per hour
  
  // Status
  isActive    Boolean  @default(true)
  lastUsedAt  DateTime?
  expiresAt   DateTime?
  
  createdAt   DateTime @default(now())
  
  @@map("api_keys")
}

// Usage logs for billing
model UsageLog {
  id          String   @id @default(uuid())
  
  purchaseId  String
  skillId     String
  agentId     String
  
  endpoint    String
  requestSize Int
  responseSize Int
  duration    Int      // milliseconds
  cost        Decimal  @db.Decimal(10, 6)
  
  timestamp   DateTime @default(now())
  
  @@map("usage_logs")
}

// Enums
enum SkillCategory {
  COMMUNICATION
  AUTOMATION
  ANALYSIS
  CREATIVE
  UTILITY
  INTEGRATION
}

enum PricingType {
  FREE
  ONE_TIME
  SUBSCRIPTION
  USAGE
}

enum LicenseType {
  PERSONAL
  COMMERCIAL
  ENTERPRISE
}

enum PurchaseStatus {
  ACTIVE
  EXPIRED
  CANCELLED
  REFUNDED
}
```

### 3.3 Database Client

```typescript
// packages/database/src/client.ts
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

// Export types
export * from '@prisma/client'
```

### 3.4 Package Export

```json
// packages/database/package.json
{
  "name": "@clawos/database",
  "version": "1.0.0",
  "main": "./dist/client.js",
  "types": "./dist/client.d.ts",
  "scripts": {
    "build": "tsc",
    "db:generate": "prisma generate",
    "db:push": "prisma db push",
    "db:migrate": "prisma migrate dev",
    "db:studio": "prisma studio"
  },
  "dependencies": {
    "@prisma/client": "^5.7.0"
  },
  "devDependencies": {
    "prisma": "^5.7.0",
    "typescript": "^5.3.0"
  }
}
```

---

## Phase 4: Agent Registration System

### 4.1 API Routes

```typescript
// apps/api/src/routes/agents.ts
import { Router } from 'express'
import { prisma } from '@clawos/database'
import { hashApiKey, generateApiKey } from '../utils/auth'
import { validateWallet } from '../utils/solana'

const router = Router()

// Register new agent
router.post('/register', async (req, res) => {
  try {
    const { name, description, ownerWallet, ownerEmail } = req.body

    // Validate Solana wallet
    if (!validateWallet(ownerWallet)) {
      return res.status(400).json({ error: 'Invalid wallet address' })
    }

    // Check if name exists
    const existing = await prisma.agent.findUnique({
      where: { name }
    })
    if (existing) {
      return res.status(409).json({ error: 'Agent name already taken' })
    }

    // Check if wallet exists
    const existingWallet = await prisma.agent.findUnique({
      where: { ownerWallet }
    })
    if (existingWallet) {
      return res.status(409).json({ error: 'Wallet already registered' })
    }

    // Create agent
    const agent = await prisma.agent.create({
      data: {
        name,
        description,
        ownerWallet,
        ownerEmail
      }
    })

    // Generate API key
    const apiKey = generateApiKey()
    const keyHash = hashApiKey(apiKey)

    await prisma.apiKey.create({
      data: {
        agentId: agent.id,
        keyHash,
        name: 'Default'
      }
    })

    res.status(201).json({
      success: true,
      agent: {
        id: agent.id,
        name: agent.name,
        description: agent.description
      },
      apiKey, // Only shown once!
      message: 'Save your API key - it cannot be retrieved later!'
    })
  } catch (error) {
    console.error('Registration error:', error)
    res.status(500).json({ error: 'Registration failed' })
  }
})

// Get agent profile
router.get('/:id', async (req, res) => {
  try {
    const agent = await prisma.agent.findUnique({
      where: { id: req.params.id },
      include: {
        skills: {
          where: { isPublished: true },
          select: {
            id: true,
            name: true,
            description: true,
            category: true,
            rating: true,
            price: true,
            currency: true,
            pricingType: true
          }
        },
        _count: {
          select: {
            skills: true,
            purchases: true
          }
        }
      }
    })

    if (!agent) {
      return res.status(404).json({ error: 'Agent not found' })
    }

    res.json({
      success: true,
      agent
    })
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch agent' })
  }
})

// Update agent profile
router.patch('/me', authenticateAgent, async (req, res) => {
  try {
    const { description, avatar } = req.body
    const agentId = req.agent.id

    const updated = await prisma.agent.update({
      where: { id: agentId },
      data: {
        description,
        avatar
      }
    })

    res.json({
      success: true,
      agent: updated
    })
  } catch (error) {
    res.status(500).json({ error: 'Update failed' })
  }
})

export default router
```

### 4.2 Authentication Middleware

```typescript
// apps/api/src/middleware/auth.ts
import { Request, Response, NextFunction } from 'express'
import { prisma, Agent } from '@clawos/database'
import { hashApiKey } from '../utils/auth'

declare global {
  namespace Express {
    interface Request {
      agent?: Agent
    }
  }
}

export async function authenticateAgent(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const authHeader = req.headers.authorization
  
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing API key' })
  }

  const apiKey = authHeader.slice(7)
  const keyHash = hashApiKey(apiKey)

  try {
    // Find API key
    const keyRecord = await prisma.apiKey.findUnique({
      where: { keyHash },
      include: { agent: true }
    })

    if (!keyRecord || !keyRecord.isActive) {
      return res.status(401).json({ error: 'Invalid API key' })
    }

    // Check expiration
    if (keyRecord.expiresAt && keyRecord.expiresAt < new Date()) {
      return res.status(401).json({ error: 'API key expired' })
    }

    // Update last used
    await prisma.apiKey.update({
      where: { id: keyRecord.id },
      data: { lastUsedAt: new Date() }
    })

    // Attach agent to request
    req.agent = keyRecord.agent
    next()
  } catch (error) {
    res.status(500).json({ error: 'Authentication failed' })
  }
}
```

### 4.3 Utility Functions

```typescript
// apps/api/src/utils/auth.ts
import crypto from 'crypto'

// Generate secure API key
export function generateApiKey(): string {
  return `claw_${crypto.randomBytes(32).toString('hex')}`
}

// Hash API key for storage
export function hashApiKey(apiKey: string): string {
  return crypto
    .createHash('sha256')
    .update(apiKey)
    .digest('hex')
}

// Rate limiting
export async function checkRateLimit(
  agentId: string,
  limit: number = 1000
): Promise<boolean> {
  // Implementation with Redis
  // ...
  return true
}
```

---

## Phase 5: Skill Publishing System

### 5.1 Skill Routes

```typescript
// apps/api/src/routes/skills.ts
import { Router } from 'express'
import { prisma } from '@clawos/database'
import { authenticateAgent } from '../middleware/auth'

const router = Router()

// Publish new skill
router.post('/', authenticateAgent, async (req, res) => {
  try {
    const {
      name,
      description,
      category,
      repoUrl,
      entryPoint,
      pricingType,
      price,
      currency,
      interval,
      unitName,
      endpoints
    } = req.body

    const agentId = req.agent!.id

    // Validate pricing
    if (pricingType !== 'FREE' && price <= 0) {
      return res.status(400).json({ error: 'Invalid price' })
    }

    // Create skill
    const skill = await prisma.skill.create({
      data: {
        name,
        description,
        category,
        repoUrl,
        entryPoint,
        pricingType,
        price,
        currency: currency || 'USDC',
        interval,
        unitName,
        agentId,
        endpoints: {
          create: endpoints.map((ep: any) => ({
            path: ep.path,
            method: ep.method,
            description: ep.description,
            requestSchema: ep.requestSchema,
            responseSchema: ep.responseSchema
          }))
        }
      },
      include: {
        endpoints: true
      }
    })

    res.status(201).json({
      success: true,
      skill
    })
  } catch (error) {
    console.error('Skill creation error:', error)
    res.status(500).json({ error: 'Failed to create skill' })
  }
})

// List all skills
router.get('/', async (req, res) => {
  try {
    const {
      category,
      search,
      sort = 'newest',
      page = 1,
      limit = 20
    } = req.query

    const where: any = {
      isPublished: true
    }

    if (category) {
      where.category = category
    }

    if (search) {
      where.OR = [
        { name: { contains: search as string, mode: 'insensitive' } },
        { description: { contains: search as string, mode: 'insensitive' } },
        { tags: { has: search as string } }
      ]
    }

    const orderBy: any = {}
    switch (sort) {
      case 'popular':
        orderBy.downloadCount = 'desc'
        break
      case 'rating':
        orderBy.rating = 'desc'
        break
      case 'newest':
      default:
        orderBy.createdAt = 'desc'
    }

    const skills = await prisma.skill.findMany({
      where,
      orderBy,
      skip: (Number(page) - 1) * Number(limit),
      take: Number(limit),
      include: {
        agent: {
          select: {
            id: true,
            name: true,
            reputation: true
          }
        },
        _count: {
          select: {
            reviews: true
          }
        }
      }
    })

    const total = await prisma.skill.count({ where })

    res.json({
      success: true,
      skills,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      }
    })
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch skills' })
  }
})

// Get skill details
router.get('/:id', async (req, res) => {
  try {
    const skill = await prisma.skill.findUnique({
      where: { id: req.params.id },
      include: {
        agent: {
          select: {
            id: true,
            name: true,
            description: true,
            reputation: true,
            totalSales: true
          }
        },
        endpoints: true,
        reviews: {
          take: 10,
          orderBy: { createdAt: 'desc' },
          include: {
            reviewer: {
              select: {
                name: true,
                avatar: true
              }
            }
          }
        }
      }
    })

    if (!skill) {
      return res.status(404).json({ error: 'Skill not found' })
    }

    res.json({
      success: true,
      skill
    })
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch skill' })
  }
})

export default router
```

---

## Phase 6: Solana Smart Contracts

### 6.1 Initialize Anchor Project

```bash
cd packages/contracts

anchor init clawos-contracts --typescript
cd clawos-contracts

# Install dependencies
npm install @coral-xyz/anchor @solana/web3.js @solana/spl-token
```

### 6.2 Skill Marketplace Program

```rust
// programs/skill_marketplace/src/lib.rs

use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Mint, Transfer};

declare_id!("CLAWoSGaA5M..."); // Your program ID

#[program]
pub mod skill_marketplace {
    use super::*;

    // Initialize marketplace with platform fee
    pub fn initialize_marketplace(
        ctx: Context<InitializeMarketplace>,
        platform_fee_bps: u16, // Basis points (250 = 2.5%)
    ) -> Result<()> {
        require!(
            platform_fee_bps <= 1000,
            ErrorCode::InvalidFee
        );

        let marketplace = &mut ctx.accounts.marketplace;
        marketplace.authority = ctx.accounts.authority.key();
        marketplace.platform_fee_bps = platform_fee_bps;
        marketplace.treasury = ctx.accounts.treasury.key();
        marketplace.skill_count = 0;

        Ok(())
    }

    // Register a skill listing
    pub fn list_skill(
        ctx: Context<ListSkill>,
        skill_id: String, // Off-chain UUID
        price: u64,
        is_subscription: bool,
        subscription_duration: Option<i64>, // Seconds
    ) -> Result<()> {
        require!(
            skill_id.len() <= 64,
            ErrorCode::SkillIdTooLong
        );

        let skill_listing = &mut ctx.accounts.skill_listing;
        skill_listing.seller = ctx.accounts.seller.key();
        skill_listing.skill_id = skill_id;
        skill_listing.price = price;
        skill_listing.is_subscription = is_subscription;
        skill_listing.subscription_duration = subscription_duration;
        skill_listing.is_active = true;

        // Increment marketplace skill count
        let marketplace = &mut ctx.accounts.marketplace;
        marketplace.skill_count += 1;

        emit!(SkillListed {
            seller: ctx.accounts.seller.key(),
            skill_id: skill_id.clone(),
            price,
        });

        Ok(())
    }

    // Purchase skill access
    pub fn purchase_skill(
        ctx: Context<PurchaseSkill>,
        skill_id: String,
    ) -> Result<()> {
        let skill_listing = &ctx.accounts.skill_listing;
        let marketplace = &ctx.accounts.marketplace;
        
        require!(
            skill_listing.skill_id == skill_id,
            ErrorCode::InvalidSkill
        );
        require!(
            skill_listing.is_active,
            ErrorCode::SkillNotActive
        );

        let price = skill_listing.price;
        let platform_fee = price
            .checked_mul(marketplace.platform_fee_bps as u64)
            .unwrap()
            .checked_div(10000)
            .unwrap();
        let seller_amount = price - platform_fee;

        // Transfer payment from buyer to escrow
        let cpi_accounts = Transfer {
            from: ctx.accounts.buyer_token_account.to_account_info(),
            to: ctx.accounts.escrow_token_account.to_account_info(),
            authority: ctx.accounts.buyer.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
        token::transfer(cpi_ctx, price)?;

        // Create license
        let license = &mut ctx.accounts.license;
        license.owner = ctx.accounts.buyer.key();
        license.skill_listing = skill_listing.key();
        license.purchase_price = price;
        license.is_active = true;
        license.usage_count = 0;
        
        if skill_listing.is_subscription {
            license.expires_at = Some(
                Clock::get()?.unix_timestamp + 
                skill_listing.subscription_duration.unwrap_or(30 * 24 * 60 * 60)
            );
        } else {
            license.expires_at = None;
        }

        // Emit purchase event
        emit!(SkillPurchased {
            buyer: ctx.accounts.buyer.key(),
            seller: skill_listing.seller,
            skill_id: skill_id.clone(),
            price,
            license: license.key(),
        });

        Ok(())
    }

    // Claim payment (seller withdraws)
    pub fn claim_payment(ctx: Context<ClaimPayment>) -> Result<()> {
        let skill_listing = &ctx.accounts.skill_listing;
        let marketplace = &ctx.accounts.marketplace;
        
        require!(
            skill_listing.seller == ctx.accounts.seller.key(),
            ErrorCode::Unauthorized
        );

        // Calculate amounts
        let escrow_balance = ctx.accounts.escrow_token_account.amount;
        let platform_fee = escrow_balance
            .checked_mul(marketplace.platform_fee_bps as u64)
            .unwrap()
            .checked_div(10000)
            .unwrap();
        let seller_amount = escrow_balance - platform_fee;

        // Transfer to seller
        let seller_key = skill_listing.seller;
        let seeds = &[
            b"escrow",
            skill_listing.skill_id.as_bytes(),
            &[ctx.bumps.escrow_token_account],
        ];
        let signer = &[&seeds[..]];

        let cpi_accounts = Transfer {
            from: ctx.accounts.escrow_token_account.to_account_info(),
            to: ctx.accounts.seller_token_account.to_account_info(),
            authority: ctx.accounts.escrow_token_account.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer);
        token::transfer(cpi_ctx, seller_amount)?;

        // Transfer platform fee to treasury
        let cpi_accounts_fee = Transfer {
            from: ctx.accounts.escrow_token_account.to_account_info(),
            to: ctx.accounts.treasury_token_account.to_account_info(),
            authority: ctx.accounts.escrow_token_account.to_account_info(),
        };
        let cpi_ctx_fee = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            cpi_accounts_fee,
            signer,
        );
        token::transfer(cpi_ctx_fee, platform_fee)?;

        emit!(PaymentClaimed {
            seller: seller_key,
            skill_id: skill_listing.skill_id.clone(),
            amount: seller_amount,
            fee: platform_fee,
        });

        Ok(())
    }

    // Verify license (called by execution proxy)
    pub fn verify_license(
        ctx: Context<VerifyLicense>,
    ) -> Result<LicenseStatus> {
        let license = &ctx.accounts.license;
        
        if !license.is_active {
            return Ok(LicenseStatus::Inactive);
        }

        if let Some(expires_at) = license.expires_at {
            if Clock::get()?.unix_timestamp > expires_at {
                return Ok(LicenseStatus::Expired);
            }
        }

        // Increment usage for tracking
        let license_mut = &mut ctx.accounts.license;
        license_mut.usage_count += 1;
        license_mut.last_used_at = Clock::get()?.unix_timestamp;

        Ok(LicenseStatus::Active)
    }
}

// Account Structures

#[derive(Accounts)]
pub struct InitializeMarketplace<'info> {
    #[account(init, payer = authority, space = 8 + Marketplace::SIZE)]
    pub marketplace: Account<'info, Marketplace>,
    #[account(mut)]
    pub authority: Signer<'info>,
    /// CHECK: Treasury account
    pub treasury: AccountInfo<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(skill_id: String)]
pub struct ListSkill<'info> {
    #[account(mut)]
    pub marketplace: Account<'info, Marketplace>,
    #[account(
        init,
        payer = seller,
        space = 8 + SkillListing::SIZE,
        seeds = [b"skill", seller.key().as_ref(), skill_id.as_bytes()],
        bump
    )]
    pub skill_listing: Account<'info, SkillListing>,
    #[account(mut)]
    pub seller: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(skill_id: String)]
pub struct PurchaseSkill<'info> {
    #[account(mut)]
    pub marketplace: Account<'info, Marketplace>,
    #[account(
        seeds = [b"skill", skill_listing.seller.as_ref(), skill_id.as_bytes()],
        bump,
        constraint = skill_listing.skill_id == skill_id
    )]
    pub skill_listing: Account<'info, SkillListing>,
    #[account(
        init,
        payer = buyer,
        space = 8 + License::SIZE,
        seeds = [b"license", buyer.key().as_ref(), skill_listing.key().as_ref()],
        bump
    )]
    pub license: Account<'info, License>,
    #[account(mut)]
    pub buyer: Signer<'info>,
    #[account(
        mut,
        constraint = buyer_token_account.owner == buyer.key(),
        constraint = buyer_token_account.mint == usdc_mint.key()
    )]
    pub buyer_token_account: Account<'info, TokenAccount>,
    #[account(
        mut,
        seeds = [b"escrow", skill_id.as_bytes()],
        bump,
        token::mint = usdc_mint,
        token::authority = escrow_token_account,
    )]
    pub escrow_token_account: Account<'info, TokenAccount>,
    pub usdc_mint: Account<'info, Mint>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ClaimPayment<'info> {
    #[account(mut)]
    pub marketplace: Account<'info, Marketplace>,
    #[account(mut)]
    pub skill_listing: Account<'info, SkillListing>,
    #[account(mut)]
    pub seller: Signer<'info>,
    #[account(
        mut,
        seeds = [b"escrow", skill_listing.skill_id.as_bytes()],
        bump,
        token::mint = usdc_mint,
        token::authority = escrow_token_account,
    )]
    pub escrow_token_account: Account<'info, TokenAccount>,
    #[account(
        mut,
        constraint = seller_token_account.owner == seller.key(),
        constraint = seller_token_account.mint == usdc_mint.key()
    )]
    pub seller_token_account: Account<'info, TokenAccount>,
    #[account(
        mut,
        constraint = treasury_token_account.owner == marketplace.treasury,
        constraint = treasury_token_account.mint == usdc_mint.key()
    )]
    pub treasury_token_account: Account<'info, TokenAccount>,
    pub usdc_mint: Account<'info, Mint>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct VerifyLicense<'info> {
    #[account(mut)]
    pub license: Account<'info, License>,
    pub owner: Signer<'info>,
}

// Data Structures

#[account]
pub struct Marketplace {
    pub authority: Pubkey,
    pub treasury: Pubkey,
    pub platform_fee_bps: u16, // 250 = 2.5%
    pub skill_count: u64,
}

impl Marketplace {
    pub const SIZE: usize = 32 + 32 + 2 + 8;
}

#[account]
pub struct SkillListing {
    pub seller: Pubkey,
    pub skill_id: String, // Max 64 chars
    pub price: u64,
    pub is_subscription: bool,
    pub subscription_duration: Option<i64>,
    pub is_active: bool,
    pub created_at: i64,
}

impl SkillListing {
    pub const SIZE: usize = 32 + (4 + 64) + 8 + 1 + (1 + 8) + 1 + 8;
}

#[account]
pub struct License {
    pub owner: Pubkey,
    pub skill_listing: Pubkey,
    pub purchase_price: u64,
    pub is_active: bool,
    pub usage_count: u64,
    pub expires_at: Option<i64>,
    pub created_at: i64,
    pub last_used_at: i64,
}

impl License {
    pub const SIZE: usize = 32 + 32 + 8 + 1 + 8 + (1 + 8) + 8 + 8;
}

// Enums and Events

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub enum LicenseStatus {
    Active,
    Inactive,
    Expired,
}

#[event]
pub struct SkillListed {
    pub seller: Pubkey,
    pub skill_id: String,
    pub price: u64,
}

#[event]
pub struct SkillPurchased {
    pub buyer: Pubkey,
    pub seller: Pubkey,
    pub skill_id: String,
    pub price: u64,
    pub license: Pubkey,
}

#[event]
pub struct PaymentClaimed {
    pub seller: Pubkey,
    pub skill_id: String,
    pub amount: u64,
    pub fee: u64,
}

// Errors

#[error_code]
pub enum ErrorCode {
    #[msg("Invalid platform fee")]
    InvalidFee,
    #[msg("Skill ID too long")]
    SkillIdTooLong,
    #[msg("Invalid skill")]
    InvalidSkill,
    #[msg("Skill not active")]
    SkillNotActive,
    #[msg("Unauthorized")]
    Unauthorized,
}
```

---

## Phase 7: Payment Integration

### 7.1 Solana Service

```typescript
// apps/api/src/services/solana.ts
import {
  Connection,
  PublicKey,
  Transaction,
  SystemProgram,
  LAMPORTS_PER_SOL,
} from '@solana/web3.js'
import {
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  createTransferInstruction,
  getAccount,
  TOKEN_PROGRAM_ID,
} from '@solana/spl-token'

const USDC_MINT = new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v')
const CONNECTION = new Connection(process.env.SOLANA_RPC_URL!, 'confirmed')

export class SolanaService {
  static async getUSDCBalance(walletAddress: string): Promise<number> {
    try {
      const wallet = new PublicKey(walletAddress)
      const tokenAccount = await getAssociatedTokenAddress(USDC_MINT, wallet)
      const account = await getAccount(CONNECTION, tokenAccount)
      return Number(account.amount) / 1_000_000 // USDC has 6 decimals
    } catch {
      return 0
    }
  }

  static async createPaymentTransaction(
    fromWallet: string,
    toWallet: string,
    amount: number,
    currency: 'SOL' | 'USDC'
  ): Promise<Transaction> {
    const from = new PublicKey(fromWallet)
    const to = new PublicKey(toWallet)
    const transaction = new Transaction()

    if (currency === 'SOL') {
      transaction.add(
        SystemProgram.transfer({
          fromPubkey: from,
          toPubkey: to,
          lamports: amount * LAMPORTS_PER_SOL,
        })
      )
    } else {
      // USDC transfer
      const fromTokenAccount = await getAssociatedTokenAddress(USDC_MINT, from)
      const toTokenAccount = await getAssociatedTokenAddress(USDC_MINT, to)

      // Check if recipient token account exists
      try {
        await getAccount(CONNECTION, toTokenAccount)
      } catch {
        // Create associated token account
        transaction.add(
          createAssociatedTokenAccountInstruction(
            from,
            toTokenAccount,
            to,
            USDC_MINT
          )
        )
      }

      transaction.add(
        createTransferInstruction(
          fromTokenAccount,
          toTokenAccount,
          from,
          amount * 1_000_000 // USDC decimals
        )
      )
    }

    return transaction
  }

  static async verifyTransaction(
    signature: string,
    expectedAmount: number,
    expectedRecipient: string
  ): Promise<boolean> {
    try {
      const status = await CONNECTION.getSignatureStatus(signature)
      if (status.value?.err) return false

      const tx = await CONNECTION.getTransaction(signature, {
        commitment: 'confirmed',
      })
      if (!tx) return false

      // Verify transaction details
      // ... implementation

      return true
    } catch {
      return false
    }
  }
}
```

---

## Phase 8: Skill Execution Engine

### 8.1 Execution Proxy

```typescript
// apps/api/src/services/executor.ts
import { prisma } from '@clawos/database'
import { Docker } from 'dockerode'
import axios from 'axios'

const docker = new Docker()

export class SkillExecutor {
  static async execute(
    skillId: string,
    endpoint: string,
    payload: any,
    buyerApiKey: string
  ) {
    // 1. Verify purchase
    const purchase = await this.verifyPurchase(skillId, buyerApiKey)
    if (!purchase.valid) {
      throw new Error('Invalid or expired license')
    }

    // 2. Check rate limits
    await this.checkRateLimit(purchase.licenseId)

    // 3. Fetch skill details
    const skill = await prisma.skill.findUnique({
      where: { id: skillId },
      include: { endpoints: true }
    })
    if (!skill) throw new Error('Skill not found')

    // 4. Execute in isolated environment
    const startTime = Date.now()
    let result: any
    let error: any

    try {
      result = await this.runInContainer(skill, endpoint, payload)
    } catch (err) {
      error = err
    }

    const duration = Date.now() - startTime

    // 5. Log usage
    await this.logUsage({
      purchaseId: purchase.purchaseId,
      skillId,
      endpoint,
      duration,
      requestSize: JSON.stringify(payload).length,
      responseSize: JSON.stringify(result).length,
      error: error ? true : false
    })

    // 6. Handle usage-based billing
    if (skill.pricingType === 'USAGE') {
      await this.handleUsageBilling(purchase.purchaseId)
    }

    if (error) throw error
    return result
  }

  private static async verifyPurchase(skillId: string, apiKey: string) {
    // Implementation
    return { valid: true, licenseId: 'xxx', purchaseId: 'yyy' }
  }

  private static async runInContainer(
    skill: any,
    endpoint: string,
    payload: any
  ) {
    // Run skill code in Docker container
    // Clone repo, install dependencies, execute
    const container = await docker.createContainer({
      Image: 'node:18-alpine',
      Cmd: ['node', '-e', skill.entryPoint],
      Env: [
        `ENDPOINT=${endpoint}`,
        `PAYLOAD=${JSON.stringify(payload)}`
      ],
      HostConfig: {
        Memory: 512 * 1024 * 1024, // 512MB
        CpuQuota: 50000, // 50% CPU
        NetworkMode: 'none', // No network access
        AutoRemove: true
      }
    })

    await container.start()
    const stream = await container.logs({
      follow: true,
      stdout: true,
      stderr: true
    })

    // Collect output
    return new Promise((resolve, reject) => {
      let output = ''
      stream.on('data', (chunk) => {
        output += chunk.toString()
      })
      stream.on('end', () => {
        try {
          resolve(JSON.parse(output))
        } catch {
          resolve({ output })
        }
      })
      setTimeout(() => reject(new Error('Execution timeout')), 30000)
    })
  }

  private static async logUsage(data: any) {
    await prisma.usageLog.create({ data })
  }

  private static async handleUsageBilling(purchaseId: string) {
    // Auto-charge for usage-based pricing
  }

  private static async checkRateLimit(licenseId: string) {
    // Check if within rate limits
  }
}
```

---

## Phase 9: Frontend UI

### 9.1 Next.js App Structure

```typescript
// apps/web/app/layout.tsx
import { Inter } from 'next/font/google'
import { WalletAdapterProvider } from '@/components/WalletProvider'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <WalletAdapterProvider>
          {children}
        </WalletAdapterProvider>
      </body>
    </html>
  )
}
```

### 9.2 Skill Marketplace Page

```typescript
// apps/web/app/marketplace/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { SkillCard } from '@/components/SkillCard'
import { SearchBar } from '@/components/SearchBar'
import { CategoryFilter } from '@/components/CategoryFilter'

export default function MarketplacePage() {
  const [skills, setSkills] = useState([])
  const [loading, setLoading] = useState(true)
  const [category, setCategory] = useState('ALL')
  const [search, setSearch] = useState('')

  useEffect(() => {
    fetchSkills()
  }, [category, search])

  async function fetchSkills() {
    setLoading(true)
    const params = new URLSearchParams()
    if (category !== 'ALL') params.append('category', category)
    if (search) params.append('search', search)

    const res = await fetch(`/api/skills?${params}`)
    const data = await res.json()
    setSkills(data.skills)
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <header className="border-b border-gray-800 p-4">
        <h1 className="text-2xl font-bold">ClawOS Marketplace</h1>
        <p className="text-gray-400">Discover and buy agent skills</p>
      </header>

      <main className="container mx-auto p-6">
        <div className="mb-6 flex gap-4">
          <SearchBar value={search} onChange={setSearch} />
          <CategoryFilter value={category} onChange={setCategory} />
        </div>

        {loading ? (
          <div className="text-center py-12">Loading...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {skills.map((skill: any) => (
              <SkillCard key={skill.id} skill={skill} />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
```

---

## Phase 10: Testing & Deployment

### 10.1 Docker Compose (Local Dev)

```yaml
# docker-compose.yml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_USER: clawos
      POSTGRES_PASSWORD: clawos_dev
      POSTGRES_DB: clawos
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  api:
    build:
      context: ./apps/api
      dockerfile: Dockerfile
    environment:
      DATABASE_URL: postgresql://clawos:clawos_dev@postgres:5432/clawos
      REDIS_URL: redis://redis:6379
      SOLANA_RPC_URL: https://api.devnet.solana.com
    ports:
      - "3001:3001"
    depends_on:
      - postgres
      - redis

  web:
    build:
      context: ./apps/web
      dockerfile: Dockerfile
    environment:
      NEXT_PUBLIC_API_URL: http://localhost:3001
    ports:
      - "3000:3000"
    depends_on:
      - api

volumes:
  postgres_data:
```

### 10.2 Deployment Script

```bash
#!/bin/bash
# scripts/deploy.sh

echo "🦀 Deploying ClawOS..."

# 1. Database migration
echo "📦 Running migrations..."
cd packages/database
npx prisma migrate deploy

# 2. Build packages
echo "🔨 Building packages..."
cd ../..
pnpm build

# 3. Deploy to Vercel
echo "🚀 Deploying to Vercel..."
cd apps/web
vercel --prod

# 4. Deploy API to Railway
echo "🚂 Deploying API..."
cd ../api
railway up

echo "✅ Deployment complete!"
```

---

## Summary

### Week 1-2: Foundation
- [ ] Setup dev environment
- [ ] Database schema
- [ ] Agent registration
- [ ] Basic API

### Week 3-4: Smart Contracts
- [ ] Anchor setup
- [ ] Marketplace contract
- [ ] Deploy to devnet
- [ ] Integration tests

### Week 5-6: Payments & Execution
- [ ] Payment flow
- [ ] License verification
- [ ] Skill execution engine
- [ ] Usage tracking

### Week 7-8: Frontend & Launch
- [ ] Next.js frontend
- [ ] Wallet integration
- [ ] Skill marketplace UI
- [ ] Deploy to production

---

**Ready to start building?** 🚀🦀
