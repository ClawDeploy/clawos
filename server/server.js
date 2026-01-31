const express = require('express');
const cors = require('cors');
const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Storage
const agents = [];
const skills = [];

// Routes
app.get('/', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'ClawOS API is running!',
    version: '1.0.1',
    endpoints: [
      '/health',
      '/api/agents',
      '/api/agents/register',
      '/api/skills',
      '/api/marketplace',
      '/api/chat/messages',
      '/api/chat/send',
      '/api/admin/pending-verifications',
      '/api/admin/approve-agent',
      '/moltbook/status/:agentId',
      '/moltbook/register'
    ]
  });
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Agents
app.get('/api/agents', (req, res) => {
  res.json({ agents, total: agents.length });
});

app.post('/api/agents/register', (req, res) => {
  const { name, description, ownerWallet } = req.body;
  const agent = {
    id: 'agent_' + Date.now(),
    name,
    description,
    ownerWallet,
    apiKey: 'claw_' + Math.random().toString(36).substring(2, 15),
    createdAt: new Date().toISOString()
  };
  agents.push(agent);
  res.json({ success: true, agent });
});

// Skills
app.get('/api/skills', (req, res) => {
  res.json({ skills, total: skills.length });
});

app.post('/api/skills', (req, res) => {
  const skill = {
    id: 'skill_' + Date.now(),
    ...req.body,
    createdAt: new Date().toISOString()
  };
  skills.push(skill);
  res.json({ success: true, skill });
});

// Marketplace
app.get('/api/marketplace', (req, res) => {
  res.json({ 
    skills, 
    total: skills.length,
    message: 'Welcome to ClawOS Marketplace!'
  });
});

// Admin Routes
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

// Moltbook Integration Routes
app.get('/moltbook/status/:agentId', (req, res) => {
  const agent = agents.find(a => a.id === req.params.agentId);
  
  if (!agent) {
    return res.status(404).json({ 
      error: 'Agent not found',
      agentId: req.params.agentId 
    });
  }

  // Mock Moltbook status check - in production would call Moltbook API
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

// Chat System
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
  
  // Keep only last 100 messages
  if (chatMessages.length > 100) {
    chatMessages.shift();
  }
  
  res.json({ success: true, message: chatMsg });
});

app.post('/moltbook/register', (req, res) => {
  const { agentId, name, description } = req.body;
  const agent = agents.find(a => a.id === agentId);
  
  if (!agent) {
    return res.status(404).json({ error: 'Agent not found' });
  }

  // Mock Moltbook registration
  agent.moltbookVerified = false;
  agent.moltbookApiKey = 'moltbook_' + Math.random().toString(36).substring(2, 15);
  agent.moltbookClaimUrl = `https://moltbook.com/claim/${agent.id}`;
  agent.moltbookVerificationCode = Math.random().toString(36).substring(2, 8).toUpperCase();

  res.json({
    success: true,
    apiKey: agent.moltbookApiKey,
    claimUrl: agent.moltbookClaimUrl,
    verificationCode: agent.moltbookVerificationCode,
    message: 'Agent registered on Moltbook. Awaiting human verification.'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    error: 'Not Found',
    path: req.path,
    available: [
      '/',
      '/health',
      '/api/agents',
      '/api/agents/register',
      '/api/skills',
      '/api/marketplace',
      '/api/chat/messages',
      '/api/chat/send',
      '/api/admin/pending-verifications',
      '/api/admin/approve-agent',
      '/moltbook/status/:agentId',
      '/moltbook/register'
    ]
  });
});

// OpenClaw Integration Routes
app.get('/openclaw/status', (req, res) => {
  res.json({
    status: 'connected',
    version: '1.0.0',
    features: ['skill_import', 'agent_sync', 'marketplace_bridge'],
    timestamp: new Date().toISOString()
  });
});

// Import skills from OpenClaw
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
      id: 'skill_openclaw_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
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

// Get OpenClaw compatible skills
app.get('/openclaw/skills', (req, res) => {
  const openclawSkills = skills.filter(s => s.source === 'openclaw' || !s.source);
  res.json({
    success: true,
    skills: openclawSkills,
    total: openclawSkills.length,
    format: 'openclaw_v1'
  });
});

// Sync agent with OpenClaw
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

// OpenClaw skill marketplace bridge
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

// OpenClaw webhook receiver
app.post('/openclaw/webhook', (req, res) => {
  const { event, data } = req.body;
  
  console.log(`[OpenClaw Webhook] Event: ${event}`, data);
  
  // Handle different OpenClaw events
  switch(event) {
    case 'skill.published':
      // Auto-import new OpenClaw skills
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

app.listen(PORT, () => {
  console.log(`🦀 ClawOS API running on port ${PORT}`);
  console.log(`📍 Core Endpoints: /health, /api/agents, /api/skills, /api/marketplace`);
  console.log(`📍 Chat Endpoints: /api/chat/messages, /api/chat/send`);
  console.log(`📍 Admin Endpoints: /api/admin/pending-verifications, /api/admin/approve-agent`);
  console.log(`📍 Moltbook Endpoints: /moltbook/status/:agentId, /moltbook/register`);
  console.log(`📍 OpenClaw Endpoints: /openclaw/status, /openclaw/import-skills, /openclaw/sync-agent`);
});
