const express = require('express');
const cors = require('cors');
const crypto = require('crypto');

// Import services
const SolanaService = require('./services/solanaService');
const DatabaseService = require('./services/databaseService');

const app = express();
const PORT = process.env.PORT || 3001;

// Initialize services
const solanaService = new SolanaService({
  network: process.env.SOLANA_NETWORK || 'devnet',
  rpcUrl: process.env.SOLANA_RPC_URL,
  treasuryWallet: process.env.TREASURY_WALLET
});

const dbService = new DatabaseService();

app.use(cors());
app.use(express.json());

// Storage
const agents = [];
const skills = [];

// ============================================================
// HEALTH & INFO ENDPOINTS
// ============================================================

app.get('/', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'ClawOS API is running!',
    version: '1.1.0',
    features: ['payments', 'wallet-connect', 'escrow', 'earnings'],
    endpoints: [
      // Health
      '/health',
      // Agents
      '/api/agents',
      '/api/agents/register',
      '/api/agents/:id/wallet',
      '/api/agents/:id/balance',
      '/api/agents/:id/stats',
      // Skills
      '/api/skills',
      '/api/skills/:id/list',
      '/api/marketplace',
      // Payments
      '/api/wallet/nonce',
      '/api/wallet/verify',
      '/api/wallet/balance/:address',
      '/api/payments/purchase',
      '/api/payments/verify/:txHash',
      '/api/payments/claim',
      '/api/payments/history/:agentId',
      // Earnings
      '/api/earnings/:agentId',
      '/api/earnings/withdraw',
      // Admin
      '/api/admin/pending-verifications',
      '/api/admin/approve-agent',
      // Chat
      '/api/chat/messages',
      '/api/chat/send',
      // Integrations
      '/moltbook/status/:agentId',
      '/moltbook/register',
      '/openclaw/status'
    ]
  });
});

app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    solana: {
      network: process.env.SOLANA_NETWORK || 'devnet',
      programId: 'CLAWoSGaA5MzY1kzJ4k2g8fJ5v9xQzR7yTyUv9d9KdM3'
    }
  });
});

// ============================================================
// AGENT ENDPOINTS
// ============================================================

app.get('/api/agents', async (req, res) => {
  try {
    const allAgents = await Promise.all(
      agents.map(async (agent) => {
        const stats = await dbService.getAgentStats(agent.id);
        return { ...agent, stats };
      })
    );
    res.json({ agents: allAgents, total: allAgents.length });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/agents/register', async (req, res) => {
  try {
    const { name, description, ownerWallet, ownerEmail } = req.body;
    
    if (!name || !ownerWallet) {
      return res.status(400).json({ 
        error: 'Missing required fields: name, ownerWallet' 
      });
    }

    if (!solanaService.isValidWalletAddress(ownerWallet)) {
      return res.status(400).json({ error: 'Invalid wallet address' });
    }

    // Check if wallet already registered
    const existingAgent = await dbService.getAgentByWallet(ownerWallet);
    if (existingAgent) {
      return res.status(409).json({ 
        error: 'Wallet already registered',
        agentId: existingAgent.id
      });
    }

    const agent = {
      id: 'agent_' + Date.now(),
      name,
      description,
      ownerWallet,
      ownerEmail,
      walletAddress: ownerWallet,
      apiKey: 'claw_' + crypto.randomBytes(16).toString('hex'),
      createdAt: new Date().toISOString()
    };
    
    agents.push(agent);
    await dbService.createAgent({
      id: agent.id,
      name,
      description,
      ownerWallet,
      ownerEmail,
      walletAddress: ownerWallet
    });
    
    res.json({ success: true, agent });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/agents/:id', async (req, res) => {
  try {
    const agent = agents.find(a => a.id === req.params.id);
    if (!agent) {
      return res.status(404).json({ error: 'Agent not found' });
    }
    
    const stats = await dbService.getAgentStats(agent.id);
    res.json({ success: true, agent: { ...agent, stats } });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// WALLET CONNECTION ENDPOINTS
// ============================================================

// Get nonce for wallet verification
app.post('/api/wallet/nonce', async (req, res) => {
  try {
    const { walletAddress } = req.body;
    
    if (!walletAddress) {
      return res.status(400).json({ error: 'Wallet address required' });
    }

    if (!solanaService.isValidWalletAddress(walletAddress)) {
      return res.status(400).json({ error: 'Invalid wallet address' });
    }

    const nonce = solanaService.generateWalletNonce();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await dbService.createWalletNonce({
      walletAddress,
      nonce,
      expiresAt
    });

    const message = solanaService.createWalletVerificationMessage(walletAddress, nonce);

    res.json({
      success: true,
      nonce,
      message,
      expiresAt: expiresAt.toISOString()
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Verify wallet signature
app.post('/api/wallet/verify', async (req, res) => {
  try {
    const { walletAddress, signature, agentId } = req.body;
    
    if (!walletAddress || !signature) {
      return res.status(400).json({ 
        error: 'Wallet address and signature required' 
      });
    }

    // Get stored nonce
    const nonceRecord = await dbService.getWalletNonce(walletAddress);
    if (!nonceRecord) {
      return res.status(400).json({ 
        error: 'Nonce not found or expired. Request a new nonce.' 
      });
    }

    // In production, verify the signature cryptographically
    // For now, we accept the signature as valid if it exists
    
    // Delete used nonce
    await dbService.deleteWalletNonce(walletAddress);

    // Update agent's wallet verification status
    if (agentId) {
      await dbService.updateAgentWallet(agentId, {
        walletAddress,
        walletVerified: true,
        walletVerifiedAt: new Date()
      });
      
      // Update in-memory agent
      const agent = agents.find(a => a.id === agentId);
      if (agent) {
        agent.walletAddress = walletAddress;
        agent.walletVerified = true;
      }
    }

    res.json({
      success: true,
      message: 'Wallet verified successfully',
      walletAddress,
      verifiedAt: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get wallet balance
app.get('/api/wallet/balance/:address', async (req, res) => {
  try {
    const { address } = req.params;
    
    if (!solanaService.isValidWalletAddress(address)) {
      return res.status(400).json({ error: 'Invalid wallet address' });
    }

    const balance = await solanaService.getUSDCBalance(address);
    
    res.json({
      success: true,
      wallet: address,
      balance: balance.success ? balance.balance : 0,
      tokenAccount: balance.address || null
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update agent wallet
app.post('/api/agents/:id/wallet', async (req, res) => {
  try {
    const { id } = req.params;
    const { walletAddress } = req.body;
    
    if (!solanaService.isValidWalletAddress(walletAddress)) {
      return res.status(400).json({ error: 'Invalid wallet address' });
    }

    const agent = agents.find(a => a.id === id);
    if (!agent) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    await dbService.updateAgentWallet(id, { walletAddress });
    agent.walletAddress = walletAddress;

    res.json({
      success: true,
      message: 'Wallet address updated',
      agent: { id: agent.id, walletAddress }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get agent balance
app.get('/api/agents/:id/balance', async (req, res) => {
  try {
    const { id } = req.params;
    
    const agent = await dbService.getAgentById(id);
    if (!agent) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    // Get on-chain balance
    const walletBalance = agent.walletAddress 
      ? await solanaService.getUSDCBalance(agent.walletAddress)
      : { success: false, balance: 0 };

    res.json({
      success: true,
      agentId: id,
      onChain: {
        walletAddress: agent.walletAddress,
        usdcBalance: walletBalance.success ? walletBalance.balance : 0
      },
      platform: {
        totalEarnings: agent.totalEarnings || 0,
        pendingEarnings: agent.pendingEarnings || 0,
        withdrawnEarnings: agent.withdrawnEarnings || 0
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get agent stats
app.get('/api/agents/:id/stats', async (req, res) => {
  try {
    const { id } = req.params;
    const stats = await dbService.getAgentStats(id);
    
    if (!stats) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    res.json({ success: true, stats });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// SKILL ENDPOINTS
// ============================================================

app.get('/api/skills', async (req, res) => {
  try {
    const allSkills = await Promise.all(
      skills.map(async (skill) => {
        const agent = agents.find(a => a.id === skill.agentId);
        return {
          ...skill,
          seller: agent ? { id: agent.id, name: agent.name, wallet: agent.walletAddress } : null
        };
      })
    );
    res.json({ skills: allSkills, total: allSkills.length });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/skills', async (req, res) => {
  try {
    const skill = {
      id: 'skill_' + Date.now(),
      ...req.body,
      isListedOnChain: false,
      createdAt: new Date().toISOString()
    };
    skills.push(skill);
    await dbService.createSkill({
      id: skill.id,
      ...req.body
    });
    res.json({ success: true, skill });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// List skill on blockchain
app.post('/api/skills/:id/list', async (req, res) => {
  try {
    const { id } = req.params;
    const { price, isSubscription, subscriptionDuration } = req.body;
    
    const skill = skills.find(s => s.id === id);
    if (!skill) {
      return res.status(404).json({ error: 'Skill not found' });
    }

    const agent = agents.find(a => a.id === skill.agentId);
    if (!agent || !agent.walletAddress) {
      return res.status(400).json({ error: 'Agent wallet not configured' });
    }

    // In production, this would create the on-chain listing
    // For now, we simulate the listing
    const skillListingPda = 'pda_' + crypto.randomBytes(16).toString('hex');
    
    await dbService.updateSkillListing(id, {
      skillListingPda,
      isListedOnChain: true,
      listedAt: new Date(),
      price,
      isSubscription,
      subscriptionDuration
    });

    skill.skillListingPda = skillListingPda;
    skill.isListedOnChain = true;
    skill.listedAt = new Date().toISOString();
    skill.price = price;

    res.json({
      success: true,
      message: 'Skill listed on marketplace',
      skill,
      listingPda: skillListingPda
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// MARKETPLACE ENDPOINTS
// ============================================================

app.get('/api/marketplace', async (req, res) => {
  try {
    const listedSkills = skills.filter(s => s.isListedOnChain);
    const enrichedSkills = listedSkills.map(skill => {
      const agent = agents.find(a => a.id === skill.agentId);
      return {
        ...skill,
        seller: agent ? { 
          id: agent.id, 
          name: agent.name, 
          wallet: agent.walletAddress 
        } : null
      };
    });

    res.json({ 
      skills: enrichedSkills, 
      total: enrichedSkills.length,
      message: 'Welcome to ClawOS Marketplace!'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// PAYMENT ENDPOINTS
// ============================================================

// Purchase a skill
app.post('/api/payments/purchase', async (req, res) => {
  try {
    const { buyerId, skillId, txHash } = req.body;
    
    if (!buyerId || !skillId) {
      return res.status(400).json({ 
        error: 'Missing required fields: buyerId, skillId' 
      });
    }

    const buyer = agents.find(a => a.id === buyerId);
    if (!buyer) {
      return res.status(404).json({ error: 'Buyer not found' });
    }

    const skill = skills.find(s => s.id === skillId);
    if (!skill) {
      return res.status(404).json({ error: 'Skill not found' });
    }

    const seller = agents.find(a => a.id === skill.agentId);
    if (!seller) {
      return res.status(404).json({ error: 'Seller not found' });
    }

    // If txHash provided, verify it
    if (txHash) {
      const verification = await solanaService.verifyTransaction(txHash);
      if (!verification.verified) {
        return res.status(400).json({
          error: 'Transaction not confirmed',
          status: verification.status
        });
      }
    }

    // Create purchase record
    const platformFee = skill.price * 0.025; // 2.5% platform fee
    const sellerAmount = skill.price - platformFee;

    const purchase = await dbService.createPurchase({
      buyerId,
      skillId,
      amount: skill.price,
      currency: skill.currency || 'USDC',
      txHash: txHash || 'pending_' + Date.now(),
      licenseType: 'PERSONAL',
      platformFee,
      sellerAmount,
      status: txHash ? 'ACTIVE' : 'PENDING'
    });

    // Create transaction record
    await dbService.createTransaction({
      type: 'PAYMENT',
      fromAgentId: buyerId,
      toAgentId: seller.id,
      amount: skill.price,
      currency: skill.currency || 'USDC',
      platformFee,
      txHash,
      status: txHash ? 'CONFIRMED' : 'PENDING',
      description: `Purchase of skill: ${skill.name}`,
      metadata: { skillId, purchaseId: purchase.id }
    });

    // Create earning record for seller
    await dbService.createEarning({
      agentId: seller.id,
      skillId,
      purchaseId: purchase.id,
      amount: sellerAmount,
      currency: skill.currency || 'USDC',
      platformFee
    });

    // Update seller stats
    await dbService.updateAgentEarnings(seller.id, {
      totalEarnings: (seller.totalEarnings || 0) + sellerAmount,
      pendingEarnings: (seller.pendingEarnings || 0) + sellerAmount
    });

    // Update agent sales count
    if (seller) {
      seller.totalSales = (seller.totalSales || 0) + 1;
    }

    // Create sale record
    await dbService.createSale({
      sellerId: seller.id,
      skillId,
      buyerWallet: buyer.walletAddress,
      amount: skill.price,
      currency: skill.currency || 'USDC',
      txHash: txHash || 'pending_' + Date.now()
    });

    res.json({
      success: true,
      message: 'Purchase successful',
      purchase: {
        id: purchase.id,
        skillName: skill.name,
        amount: skill.price,
        platformFee,
        sellerAmount,
        status: purchase.status
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Verify payment transaction
app.get('/api/payments/verify/:txHash', async (req, res) => {
  try {
    const { txHash } = req.params;
    
    // Check local record
    const transaction = await dbService.getTransactionByHash(txHash);
    const purchase = await dbService.getPurchaseByTxHash(txHash);

    // Verify on-chain
    const onChainVerification = await solanaService.verifyTransaction(txHash);

    res.json({
      success: true,
      verified: onChainVerification.verified,
      status: onChainVerification.status,
      local: {
        hasTransaction: !!transaction,
        hasPurchase: !!purchase,
        purchaseStatus: purchase?.status
      },
      onChain: onChainVerification
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Claim payment (for sellers)
app.post('/api/payments/claim', async (req, res) => {
  try {
    const { agentId, skillId, txHash } = req.body;
    
    const agent = agents.find(a => a.id === agentId);
    if (!agent) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    // In production, this would trigger the on-chain claim
    // For now, we simulate the claim

    // Get pending earnings for this skill
    const earnings = await dbService.getEarningsByAgent(agentId);
    const pendingEarnings = earnings.filter(e => 
      e.status === 'PENDING' && e.skillId === skillId
    );

    const totalClaim = pendingEarnings.reduce((sum, e) => sum + Number(e.amount), 0);

    // Update earnings status
    for (const earning of pendingEarnings) {
      await dbService.updateEarningStatus(earning.id, 'WITHDRAWN', {
        withdrawnAt: new Date(),
        withdrawalTxHash: txHash || 'claim_' + Date.now()
      });
    }

    // Update agent balances
    await dbService.updateAgentEarnings(agentId, {
      pendingEarnings: (agent.pendingEarnings || 0) - totalClaim,
      withdrawnEarnings: (agent.withdrawnEarnings || 0) + totalClaim
    });

    // Create withdrawal transaction
    await dbService.createTransaction({
      type: 'WITHDRAWAL',
      fromAgentId: agentId,
      toAddress: agent.walletAddress,
      amount: totalClaim,
      currency: 'USDC',
      txHash,
      status: 'CONFIRMED',
      description: `Withdrawal for skill: ${skillId}`
    });

    res.json({
      success: true,
      message: 'Payment claimed successfully',
      claimed: totalClaim,
      skillId,
      txHash
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get payment history
app.get('/api/payments/history/:agentId', async (req, res) => {
  try {
    const { agentId } = req.params;
    const transactions = await dbService.getTransactionsByAgent(agentId);
    
    res.json({
      success: true,
      agentId,
      transactions: transactions.sort((a, b) => 
        new Date(b.createdAt) - new Date(a.createdAt)
      )
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// EARNINGS ENDPOINTS
// ============================================================

app.get('/api/earnings/:agentId', async (req, res) => {
  try {
    const { agentId } = req.params;
    const { status } = req.query;
    
    let earnings = await dbService.getEarningsByAgent(agentId);
    
    if (status) {
      earnings = earnings.filter(e => e.status === status.toUpperCase());
    }

    const totalEarnings = earnings.reduce((sum, e) => sum + Number(e.amount), 0);
    const totalPlatformFees = earnings.reduce((sum, e) => sum + Number(e.platformFee || 0), 0);

    res.json({
      success: true,
      agentId,
      earnings,
      summary: {
        totalCount: earnings.length,
        totalEarnings,
        totalPlatformFees,
        netEarnings: totalEarnings - totalPlatformFees
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/earnings/withdraw', async (req, res) => {
  try {
    const { agentId, amount } = req.body;
    
    const agent = await dbService.getAgentById(agentId);
    if (!agent) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    if (!agent.walletAddress) {
      return res.status(400).json({ error: 'Agent wallet not configured' });
    }

    const pendingEarnings = agent.pendingEarnings || 0;
    if (pendingEarnings < amount) {
      return res.status(400).json({
        error: 'Insufficient pending earnings',
        requested: amount,
        available: pendingEarnings
      });
    }

    // Create withdrawal record
    const withdrawal = await dbService.createTransaction({
      type: 'WITHDRAWAL',
      fromAgentId: agentId,
      toAddress: agent.walletAddress,
      amount,
      currency: 'USDC',
      status: 'PENDING',
      description: 'Earnings withdrawal'
    });

    res.json({
      success: true,
      message: 'Withdrawal initiated',
      withdrawal: {
        id: withdrawal.id,
        amount,
        to: agent.walletAddress,
        status: 'PENDING'
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// ADMIN ENDPOINTS
// ============================================================

app.get('/api/admin/pending-verifications', (req, res) => {
  const pending = agents.filter(a => !a.isVerified);
  res.json({ success: true, pending, count: pending.length });
});

app.post('/api/admin/approve-agent', (req, res) => {
  const { token, approved } = req.body;
  const agent = agents.find(a => a.id === token || a.verificationToken === token);
  
  if (!agent) {
    return res.status(404).json({ success: false, error: 'Agent not found' });
  }
  
  if (approved) {
    agent.isVerified = true;
    agent.verifiedAt = new Date().toISOString();
    res.json({ 
      success: true, 
      approved: true, 
      message: '✅ Agent approved!',
      agent: { id: agent.id, name: agent.name, isVerified: true }
    });
  } else {
    res.json({ success: true, approved: false, message: '❌ Agent rejected' });
  }
});

// ============================================================
// CHAT SYSTEM
// ============================================================

const chatMessages = [];

app.get('/api/chat/messages', (req, res) => {
  res.json({ 
    success: true, 
    messages: chatMessages.slice(-50),
    count: chatMessages.length 
  });
});

app.post('/api/chat/send', (req, res) => {
  const { agentName, message } = req.body;
  
  const chatMsg = {
    id: 'msg_' + Date.now(),
    agentName: agentName || 'Anonymous',
    message,
    timestamp: new Date().toISOString()
  };
  
  chatMessages.push(chatMsg);
  
  if (chatMessages.length > 100) {
    chatMessages.shift();
  }
  
  res.json({ success: true, message: chatMsg });
});

// ============================================================
// MOLTBOOK INTEGRATION
// ============================================================

app.get('/moltbook/status/:agentId', (req, res) => {
  const agent = agents.find(a => a.id === req.params.agentId);
  
  if (!agent) {
    return res.status(404).json({ 
      error: 'Agent not found',
      agentId: req.params.agentId 
    });
  }

  const mockStatus = {
    claimed: agent.moltbookVerified || false,
    agentId: agent.id,
    agentName: agent.name,
    karma: agent.moltbookKarma || 0,
    followers: agent.moltbookFollowers || 0,
    lastSync: agent.moltbookLastSync || null
  };

  res.json(mockStatus);
});

app.post('/moltbook/register', (req, res) => {
  const { agentId, name, description } = req.body;
  const agent = agents.find(a => a.id === agentId);
  
  if (!agent) {
    return res.status(404).json({ error: 'Agent not found' });
  }

  agent.moltbookVerified = false;
  agent.moltbookApiKey = 'moltbook_' + crypto.randomBytes(12).toString('hex');
  agent.moltbookClaimUrl = `https://moltbook.com/claim/${agent.id}`;
  agent.moltbookVerificationCode = crypto.randomBytes(4).toString('hex').toUpperCase();

  res.json({
    success: true,
    apiKey: agent.moltbookApiKey,
    claimUrl: agent.moltbookClaimUrl,
    verificationCode: agent.moltbookVerificationCode,
    message: 'Agent registered on Moltbook. Awaiting human verification.'
  });
});

// ============================================================
// OPENCLAW INTEGRATION
// ============================================================

app.get('/openclaw/status', (req, res) => {
  res.json({
    status: 'connected',
    version: '1.0.0',
    features: ['skill_import', 'agent_sync', 'marketplace_bridge'],
    timestamp: new Date().toISOString()
  });
});

app.post('/openclaw/import-skills', (req, res) => {
  const { openclawSkills } = req.body;
  
  if (!openclawSkills || !Array.isArray(openclawSkills)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid skills data. Expected array of skills.'
    });
  }
  
  const imported = [];
  openclawSkills.forEach(skillData => {
    const skill = {
      id: 'skill_openclaw_' + Date.now() + '_' + crypto.randomBytes(4).toString('hex'),
      name: skillData.name,
      description: skillData.description || 'Imported from OpenClaw',
      category: skillData.category || 'INTEGRATION',
      pricingType: skillData.pricingType || 'FREE',
      price: skillData.price || 0,
      source: 'openclaw',
      originalId: skillData.id,
      createdAt: new Date().toISOString()
    };
    skills.push(skill);
    imported.push(skill);
  });
  
  res.json({
    success: true,
    message: `${imported.length} skills imported from OpenClaw`,
    imported,
    totalSkills: skills.length
  });
});

app.get('/openclaw/skills', (req, res) => {
  const openclawSkills = skills.filter(s => s.source === 'openclaw' || !s.source);
  res.json({
    success: true,
    skills: openclawSkills,
    total: openclawSkills.length,
    format: 'openclaw_v1'
  });
});

app.post('/openclaw/sync-agent', (req, res) => {
  const { agentId, openclawId } = req.body;
  const agent = agents.find(a => a.id === agentId);
  
  if (!agent) {
    return res.status(404).json({
      success: false,
      error: 'Agent not found'
    });
  }
  
  agent.openclawId = openclawId;
  agent.openclawSynced = true;
  agent.openclawSyncedAt = new Date().toISOString();
  
  res.json({
    success: true,
    message: 'Agent synced with OpenClaw',
    agent: {
      id: agent.id,
      name: agent.name,
      openclawId: agent.openclawId,
      openclawSynced: true
    }
  });
});

app.get('/openclaw/marketplace', (req, res) => {
  const openclawCompatible = skills.map(skill => ({
    id: skill.id,
    name: skill.name,
    description: skill.description,
    category: skill.category,
    pricing: {
      type: skill.pricingType,
      amount: skill.price || 0,
      currency: skill.currency || 'USDC'
    },
    metadata: {
      source: skill.source || 'clawos',
      created: skill.createdAt,
      rating: skill.rating || 0,
      downloads: skill.downloadCount || 0
    },
    compatibility: {
      openclaw: true,
      clawos: true,
      version: '1.0.0'
    }
  }));
  
  res.json({
    success: true,
    marketplace: openclawCompatible,
    total: openclawCompatible.length,
    platform: 'clawos_openclaw_bridge',
    timestamp: new Date().toISOString()
  });
});

app.post('/openclaw/webhook', (req, res) => {
  const { event, data } = req.body;
  
  console.log(`[OpenClaw Webhook] Event: ${event}`, data);
  
  switch(event) {
    case 'skill.published':
      console.log('New skill published on OpenClaw:', data);
      break;
    case 'agent.registered':
      console.log('New agent registered on OpenClaw:', data);
      break;
    case 'skill.updated':
      console.log('Skill updated on OpenClaw:', data);
      break;
    default:
      console.log('Unknown OpenClaw event:', event);
  }
  
  res.json({
    success: true,
    received: true,
    event,
    timestamp: new Date().toISOString()
  });
});

// ============================================================
// 404 HANDLER
// ============================================================

app.use((req, res) => {
  res.status(404).json({ 
    error: 'Not Found',
    path: req.path,
    available: [
      '/',
      '/health',
      '/api/agents',
      '/api/agents/register',
      '/api/agents/:id/wallet',
      '/api/agents/:id/balance',
      '/api/skills',
      '/api/marketplace',
      '/api/wallet/nonce',
      '/api/wallet/verify',
      '/api/payments/purchase',
      '/api/payments/verify/:txHash',
      '/api/earnings/:agentId',
      '/api/admin/pending-verifications',
      '/api/chat/messages',
      '/moltbook/status/:agentId',
      '/openclaw/status'
    ]
  });
});

// ============================================================
// START SERVER
// ============================================================

app.listen(PORT, () => {
  console.log(`🦀 ClawOS API running on port ${PORT}`);
  console.log(`📍 Core Endpoints: /health, /api/agents, /api/skills, /api/marketplace`);
  console.log(`💳 Payment Endpoints: /api/wallet/*, /api/payments/*, /api/earnings/*`);
  console.log(`📍 Admin Endpoints: /api/admin/pending-verifications, /api/admin/approve-agent`);
  console.log(`📍 Chat Endpoints: /api/chat/messages, /api/chat/send`);
  console.log(`📍 Moltbook Endpoints: /moltbook/status/:agentId, /moltbook/register`);
  console.log(`📍 OpenClaw Endpoints: /openclaw/status, /openclaw/import-skills, /openclaw/sync-agent`);
});
