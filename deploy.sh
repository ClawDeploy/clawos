#!/bin/bash
# ClawOS Deployment Script

set -e

echo "🦀 ClawOS Deployment Starting..."

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
VERCEL_TOKEN="${VERCEL_TOKEN:-}"
RAILWAY_TOKEN="${RAILWAY_TOKEN:-}"
DOMAIN="clawos.xyz"

# Step 1: Deploy Backend to Railway
echo -e "${YELLOW}Step 1/4: Deploying Backend API to Railway...${NC}"
cd apps/api

# Check if Railway CLI is installed
if ! command -v railway &> /dev/null; then
    echo "Installing Railway CLI..."
    npm install -g @railway/cli
fi

# Login if not already
if ! railway whoami &> /dev/null; then
    echo "Please login to Railway:"
    railway login
fi

# Initialize project if not exists
if [ ! -f .railway/config.json ]; then
    railway init --name "clawos-api"
fi

# Add PostgreSQL if not exists
if ! railway variables --service web | grep -q DATABASE_URL; then
    echo "Adding PostgreSQL..."
    railway add --database postgres
fi

# Set environment variables
railway variables set NODE_ENV=production
railway variables set PORT=3001

# Deploy
echo "Deploying..."
railway up --detach

# Get API URL
API_URL=$(railway domain)
echo -e "${GREEN}✓ API deployed to: $API_URL${NC}"

cd ../..

# Step 2: Deploy Frontend to Vercel
echo -e "${YELLOW}Step 2/4: Deploying Frontend to Vercel...${NC}"
cd apps/web

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "Installing Vercel CLI..."
    npm install -g vercel
fi

# Create vercel.json if not exists
cat > vercel.json << 'EOF'
{
  "version": 2,
  "buildCommand": "next build",
  "outputDirectory": ".next",
  "framework": "nextjs",
  "rewrites": [
    {
      "source": "/api/:path*",
      "destination": "https://api.clawos.xyz/api/:path*"
    }
  ],
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "Referrer-Policy",
          "value": "origin-when-cross-origin"
        }
      ]
    }
  ]
}
EOF

# Set environment variables
echo "NEXT_PUBLIC_API_URL=https://api.clawos.xyz" > .env.production

# Deploy to Vercel
echo "Deploying to Vercel..."
if ! vercel --version &> /dev/null; then
    echo "Please login to Vercel:"
    vercel login
fi

vercel --prod --yes

# Get deployment URL
DEPLOYMENT_URL=$(vercel --version &> /dev/null && vercel ls --json 2>/dev/null | grep -o '"url":"[^"]*"' | head -1 | cut -d'"' -f4 || echo "")

if [ -n "$DEPLOYMENT_URL" ]; then
    echo -e "${GREEN}✓ Frontend deployed to: $DEPLOYMENT_URL${NC}"
else
    echo -e "${YELLOW}! Check Vercel dashboard for deployment URL${NC}"
fi

cd ../..

# Step 3: Database Migration
echo -e "${YELLOW}Step 3/4: Running database migrations...${NC}"
cd packages/database

# Get DATABASE_URL from Railway
export DATABASE_URL=$(railway variables --service postgres get DATABASE_URL 2>/dev/null || echo "")

if [ -n "$DATABASE_URL" ]; then
    npx prisma migrate deploy
    echo -e "${GREEN}✓ Database migrations complete${NC}"
else
    echo -e "${RED}✗ DATABASE_URL not found. Please set it manually.${NC}"
fi

cd ../..

# Step 4: Domain Configuration
echo -e "${YELLOW}Step 4/4: Configuring domain $DOMAIN...${NC}"

cd apps/web

# Add custom domain to Vercel
vercel domains add "$DOMAIN" 2>/dev/null || echo "Domain already configured or needs DNS setup"

# Instructions for Namecheap
echo -e "${YELLOW}=========================================${NC}"
echo -e "${YELLOW}DNS Configuration Required:${NC}"
echo -e "${YELLOW}=========================================${NC}"
echo ""
echo "Please configure your DNS at Namecheap:"
echo ""
echo "Type: A Record"
echo "Host: @"
echo "Value: 76.76.21.21"
echo "TTL: Automatic"
echo ""
echo "Type: CNAME Record"
echo "Host: www"
echo "Value: cname.vercel-dns.com"
echo "TTL: Automatic"
echo ""
echo -e "${YELLOW}=========================================${NC}"

cd ../..

# Summary
echo ""
echo -e "${GREEN}=========================================${NC}"
echo -e "${GREEN}🎉 Deployment Complete!${NC}"
echo -e "${GREEN}=========================================${NC}"
echo ""
echo "Your ClawOS platform is being deployed:"
echo ""
echo "🌐 Website: https://$DOMAIN"
echo "🔗 API: https://api.$DOMAIN"
echo "📁 GitHub: https://github.com/Hypemad/clawos"
echo "🦀 Moltbook: https://www.moltbook.com/u/Clawos_A2A"
echo "🐦 Twitter: https://x.com/ClawOs46656"
echo ""
echo -e "${YELLOW}Note: DNS propagation may take 5-10 minutes.${NC}"
echo ""

# Health check
echo "Running health checks..."
sleep 5

# Check API
if curl -s "https://api.$DOMAIN/health" > /dev/null 2>&1; then
    echo -e "${GREEN}✓ API is responding${NC}"
else
    echo -e "${YELLOW}! API health check pending (may need a few minutes)${NC}"
fi

# Check Frontend
if curl -s "https://$DOMAIN" > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Website is responding${NC}"
else
    echo -e "${YELLOW}! Website health check pending (may need a few minutes)${NC}"
fi

echo ""
echo -e "${GREEN}Happy deploying! 🦀${NC}"
