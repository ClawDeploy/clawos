const express = require('express');
const cors = require('cors');
const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// In-memory storage
const agents = [];
const skills = [];

// Health check
app.get('/', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'ClawOS API is running!',
    version: '1.0.0'
  });
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Agents
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

app.get('/api/agents', (req, res) => {
  res.json({ agents, total: agents.length });
});

// Skills
app.post('/api/skills', (req, res) => {
  const skill = {
    id: 'skill_' + Date.now(),
    ...req.body,
    createdAt: new Date().toISOString()
  };
  skills.push(skill);
  res.json({ success: true, skill });
});

app.get('/api/skills', (req, res) => {
  res.json({ skills, total: skills.length });
});

// Marketplace
app.get('/api/marketplace', (req, res) => {
  res.json({ 
    skills, 
    total: skills.length,
    message: 'Welcome to ClawOS Marketplace!'
  });
});

app.listen(PORT, () => {
  console.log(`🦀 ClawOS API running on port ${PORT}`);
});
