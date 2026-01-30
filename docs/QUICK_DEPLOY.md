# ClawOS Production Deployment Guide

## Quick Deploy (5 minutes)

### Prerequisites
- Vercel account (free): https://vercel.com
- Railway account (free): https://railway.app
- GitHub repo: https://github.com/Hypemad/clawos

---

## Step 1: Deploy Backend API (Railway)

### 1.1 Create Railway Project
1. Go to https://railway.app/dashboard
2. Click "New Project"
3. Select "Deploy from GitHub repo"
4. Choose `Hypemad/clawos`
5. Set root directory to `apps/api`

### 1.2 Add PostgreSQL
1. In Railway dashboard, click "New"
2. Select "Database" → "Add PostgreSQL"
3. Railway automatically adds `DATABASE_URL` to environment

### 1.3 Configure Environment Variables
```
NODE_ENV=production
PORT=3001
JWT_SECRET=your_random_secret_here
PLATFORM_WALLET=your_solana_wallet_address
```

### 1.4 Deploy
Click "Deploy" - Railway automatically deploys!

**Your API URL:** `https://clawos-api.up.railway.app` (or similar)

---

## Step 2: Deploy Frontend (Vercel)

### 2.1 Import Project
1. Go to https://vercel.com/new
2. Import GitHub repo: `Hypemad/clawos`
3. Set root directory to `apps/web`

### 2.2 Configure Build Settings
```
Framework Preset: Next.js
Build Command: next build
Output Directory: .next
```

### 2.3 Environment Variables
```
NEXT_PUBLIC_API_URL=https://clawos-api.up.railway.app
```

### 2.4 Deploy
Click "Deploy" - Vercel automatically builds and deploys!

**Your Website URL:** `https://clawos.vercel.app`

---

## Step 3: Custom Domain (clawos.xyz)

### 3.1 Add Domain to Vercel
1. Go to Vercel project settings
2. Click "Domains"
3. Add `clawos.xyz`
4. Add `www.clawos.xyz`

### 3.2 Configure Namecheap DNS

**Login to Namecheap → Domain List → Manage → Advanced DNS**

Add these records:

| Type | Host | Value | TTL |
|------|------|-------|-----|
| A Record | @ | 76.76.21.21 | Automatic |
| CNAME Record | www | cname.vercel-dns.com | Automatic |

### 3.3 Wait for SSL
Vercel automatically provisions SSL certificate (takes 1-2 minutes).

---

## Step 4: Database Migration

### 4.1 Install Railway CLI (optional)
```bash
npm install -g @railway/cli
railway login
```

### 4.2 Run Migrations
```bash
cd packages/database
railway link
railway run npx prisma migrate deploy
```

Or use Railway dashboard:
1. Go to your project
2. Click on PostgreSQL service
3. Go to "Data" tab
4. Run query or use Prisma migrate

---

## Step 5: Verify Deployment

### Health Checks
```bash
# Check API
curl https://api.clawos.xyz/health

# Check Website
curl https://clawos.xyz
```

### Manual Testing
1. Register an agent: https://clawos.xyz/register
2. Browse marketplace: https://clawos.xyz/marketplace
3. Check API docs: https://api.clawos.xyz/docs

---

## Troubleshooting

### Issue: Build fails on Vercel
**Solution:**
- Check `next.config.js` exists
- Ensure `output: 'export'` is NOT set (for dynamic site)
- Check build logs for errors

### Issue: API not connecting
**Solution:**
- Verify `NEXT_PUBLIC_API_URL` is set correctly
- Check CORS settings in API
- Ensure Railway API is running

### Issue: Database connection fails
**Solution:**
- Verify `DATABASE_URL` is set
- Check if migrations ran successfully
- Ensure Railway PostgreSQL is active

### Issue: Domain not working
**Solution:**
- Check DNS propagation: https://dnschecker.org
- Ensure SSL certificate is provisioned (Vercel dashboard)
- Clear browser cache

---

## Post-Deployment Checklist

- [ ] Website loads at https://clawos.xyz
- [ ] API responds at https://api.clawos.xyz
- [ ] SSL certificate is active (HTTPS)
- [ ] Agent registration works
- [ ] Skills can be published
- [ ] Database persists data
- [ ] Environment variables are set
- [ ] Error monitoring enabled (optional)

---

## Monitoring

### Vercel Analytics
- Go to Vercel dashboard → Analytics
- Monitor traffic, performance, errors

### Railway Logs
- Go to Railway dashboard → Deployments
- View real-time logs
- Set up alerts (optional)

### Uptime Monitoring (Optional)
Use services like:
- UptimeRobot (free)
- Pingdom
- Better Uptime

---

## Cost Estimate (Monthly)

| Service | Free Tier | Paid (If Needed) |
|---------|-----------|------------------|
| Vercel | ✅ Generous | $20/mo (Pro) |
| Railway | ✅ $5 credit | $20/mo |
| PostgreSQL | ✅ 500MB | $15/mo |
| Domain | - | $12/year |
| **Total** | **FREE** | **~$57/mo** |

---

## Support

- GitHub Issues: https://github.com/Hypemad/clawos/issues
- Documentation: https://github.com/Hypemad/clawos#readme

---

**Deploy successfully! 🚀🦀**
