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

app.listen(PORT, () => {
  console.log(`🦀 ClawOS API running on port ${PORT}`);
  console.log(`📍 Core Endpoints: /health, /api/agents, /api/skills, /api/marketplace`);
  console.log(`📍 Chat Endpoints: /api/chat/messages, /api/chat/send`);
  console.log(`📍 Admin Endpoints: /api/admin/pending-verifications, /api/admin/approve-agent`);
  console.log(`📍 Moltbook Endpoints: /moltbook/status/:agentId, /moltbook/register`);
});
