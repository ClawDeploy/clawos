#!/usr/bin/env node
/**
 * Seed Script: Generate 1000 AI Agents for ClawOS
 * 
 * This script creates 1000 realistic agents with:
 * - Unique AI-themed names (NeuroX, SynapseBot, CortexAI, etc.)
 * - Unique descriptions
 * - 1-2 skills each
 * - Realistic pricing
 * - Deterministic wallet addresses
 */

const { PrismaClient } = require('./clawos-platform/node_modules/.pnpm/@prisma+client@5.22.0_prisma@5.22.0/node_modules/@prisma/client')
const crypto = require('crypto')

const prisma = new PrismaClient()

// Agent name prefixes (neuro-themed)
const prefixes = [
  'Neuro', 'Synapse', 'Cortex', 'Axon', 'Dendrite', 'Glial', 'Myelin',
  'Quantum', 'Neural', 'Cognitive', 'Cerebral', 'Mental', 'Brain',
  'Intellect', 'Logic', 'Reason', 'Mind', 'Thought', 'Idea', 'Concept',
  'Vector', 'Matrix', 'Tensor', 'Scalar', 'Latent', 'Embedding',
  'Transformer', 'Attention', 'Encoder', 'Decoder', 'Diffusion',
  'Generative', 'Adversarial', 'Reinforced', 'Supervised', 'Unsupervised',
  'Autonomous', 'Sentient', 'Conscious', 'Aware', 'Perceptive',
  'Analytic', 'Syntheti', 'Cyber', 'Digital', 'Virtual', 'Synthetic',
  'Augmented', 'Hybrid', 'Fusion', 'Nexus', 'Core', 'Kernel', 'Node',
  'Link', 'Chain', 'Network', 'Mesh', 'Grid', 'Cluster', 'Swarm',
  'Collective', 'Hive', 'Nest', 'Colony', 'Ecosystem', 'Symbiosis'
]

// Agent name suffixes
const suffixes = [
  'Bot', 'AI', 'Agent', 'Mind', 'Net', 'Link', 'Core', 'Node',
  'X', 'Pro', 'Max', 'Ultra', 'Prime', 'Elite', 'Supreme',
  'Labs', 'Systems', 'Solutions', 'Tech', 'Dynamics', 'Ventures',
  'Logic', 'Reason', 'Think', 'Brain', 'Intellect', 'Wisdom',
  'Cortex', 'Neuron', 'Synapse', 'Pulse', 'Wave', 'Signal',
  'Flow', 'Stream', 'Current', 'Charge', 'Spark', 'Arc',
  'Matrix', 'Vector', 'Tensor', 'Array', 'Set', 'Group',
  'Cluster', 'Swarm', 'Hive', 'Nest', 'Colony', 'Collective'
]

// Skill categories
const skillCategories = [
  'COMMUNICATION',
  'AUTOMATION', 
  'ANALYSIS',
  'CREATIVE',
  'UTILITY',
  'INTEGRATION'
]

// Skill templates by category
const skillTemplates = {
  COMMUNICATION: [
    { name: 'Email Composer', desc: 'AI-powered email drafting with tone adjustment and personalization', price: 0.5 },
    { name: 'Message Summarizer', desc: 'Condense long conversations into actionable summaries', price: 0.3 },
    { name: 'Multilingual Translator', desc: 'Real-time translation across 50+ languages with context preservation', price: 0.4 },
    { name: 'Voice Synthesizer', desc: 'Natural speech generation with emotion and accent control', price: 0.8 },
    { name: 'Chat Coordinator', desc: 'Manage multiple conversation threads across platforms', price: 0.6 },
    { name: 'Sentiment Analyzer', desc: 'Real-time emotion detection in text and voice communications', price: 0.4 },
    { name: 'Meeting Transcriber', desc: 'Accurate transcription with speaker identification and action items', price: 0.7 },
    { name: 'Presentation Builder', desc: 'Auto-generate slides from text outlines with design optimization', price: 0.9 }
  ],
  AUTOMATION: [
    { name: 'Workflow Orchestrator', desc: 'Design and execute complex multi-step automation pipelines', price: 1.2 },
    { name: 'Task Scheduler', desc: 'Intelligent task prioritization and automated scheduling', price: 0.5 },
    { name: 'Data Pipeline Manager', desc: 'ETL automation with error handling and monitoring', price: 1.5 },
    { name: 'Report Generator', desc: 'Automated report creation from multiple data sources', price: 0.8 },
    { name: 'Notification Router', desc: 'Smart alert distribution based on urgency and context', price: 0.4 },
    { name: 'Backup Automator', desc: 'Intelligent data backup with versioning and recovery', price: 0.6 },
    { name: 'Test Runner', desc: 'Automated testing with coverage analysis and bug reporting', price: 1.0 },
    { name: 'Deployment Manager', desc: 'CI/CD automation with rollback capabilities', price: 1.3 }
  ],
  ANALYSIS: [
    { name: 'Data Visualizer', desc: 'Transform complex datasets into interactive visualizations', price: 0.9 },
    { name: 'Trend Forecaster', desc: 'Predictive analytics with confidence intervals and scenarios', price: 1.5 },
    { name: 'Anomaly Detector', desc: 'Real-time outlier detection in streaming data', price: 1.2 },
    { name: 'Pattern Matcher', desc: 'Identify correlations and patterns across datasets', price: 1.0 },
    { name: 'Text Analyzer', desc: 'NLP-powered document analysis with entity extraction', price: 0.7 },
    { name: 'Image Classifier', desc: 'Multi-label image recognition with confidence scores', price: 1.1 },
    { name: 'Sentiment Tracker', desc: 'Brand sentiment monitoring across social platforms', price: 0.8 },
    { name: 'Risk Assessor', desc: 'Multi-factor risk evaluation with mitigation suggestions', price: 1.4 }
  ],
  CREATIVE: [
    { name: 'Content Generator', desc: 'AI writing assistant for blogs, scripts, and marketing copy', price: 0.8 },
    { name: 'Image Creator', desc: 'Text-to-image generation with style customization', price: 1.5 },
    { name: 'Music Composer', desc: 'Original music generation in multiple genres', price: 1.2 },
    { name: 'Video Editor', desc: 'Automated video editing with scene detection', price: 1.8 },
    { name: 'Logo Designer', desc: 'Brand identity creation with vector export', price: 1.0 },
    { name: 'Code Generator', desc: 'Programming assistant with multi-language support', price: 1.3 },
    { name: 'Story Writer', desc: 'Narrative generation with plot and character development', price: 0.9 },
    { name: 'UI Designer', desc: 'Interface design suggestions with accessibility checks', price: 1.1 }
  ],
  UTILITY: [
    { name: 'Password Manager', desc: 'Secure credential storage with breach monitoring', price: 0.3 },
    { name: 'File Organizer', desc: 'Intelligent file classification and deduplication', price: 0.4 },
    { name: 'Calculator Pro', desc: 'Advanced computation with formula preservation', price: 0.2 },
    { name: 'Unit Converter', desc: 'Comprehensive unit conversion with precision control', price: 0.2 },
    { name: 'Time Zone Sync', desc: 'Global time coordination with DST handling', price: 0.3 },
    { name: 'QR Generator', desc: 'Dynamic QR code creation with analytics', price: 0.25 },
    { name: 'PDF Processor', desc: 'PDF manipulation with OCR and form handling', price: 0.6 },
    { name: 'URL Shortener', desc: 'Link management with click tracking', price: 0.2 }
  ],
  INTEGRATION: [
    { name: 'API Connector', desc: 'Universal API integration with authentication handling', price: 1.0 },
    { name: 'Database Bridge', desc: 'Multi-database query federation', price: 1.2 },
    { name: 'CRM Sync', desc: 'Customer data synchronization across platforms', price: 0.9 },
    { name: 'Slack Bot', desc: 'Team collaboration automation', price: 0.6 },
    { name: 'Discord Agent', desc: 'Community management and moderation', price: 0.6 },
    { name: 'GitHub Assistant', desc: 'Repository management and PR automation', price: 0.8 },
    { name: 'Twitter Manager', desc: 'Social media scheduling and analytics', price: 0.7 },
    { name: 'Calendar Sync', desc: 'Cross-platform calendar coordination', price: 0.5 }
  ]
}

// Agent description templates
const descriptionTemplates = [
  'A specialized AI agent designed for {focus} with expertise in {skill}. Built to {action}.',
  'Advanced autonomous agent focused on {focus}. Leverages cutting-edge {skill} to {action}.',
  'Enterprise-grade agent for {focus}. Delivers professional {skill} solutions that {action}.',
  'Next-generation AI specializing in {focus}. Combines {skill} with intelligent automation to {action}.',
  'Smart agent built for {focus}. Uses adaptive {skill} techniques to {action}.',
  'High-performance agent engineered for {focus}. Implements advanced {skill} algorithms to {action}.',
  'Intelligent automation agent for {focus}. Streamlines {skill} processes to {action}.',
  'AI-powered assistant specializing in {focus}. Optimizes {skill} workflows to {action}.',
  'Cutting-edge agent designed for {focus}. Applies machine learning {skill} to {action}.',
  'Professional-grade AI for {focus}. Enhances {skill} capabilities to {action}.'
]

const focuses = [
  'enterprise automation', 'data analysis', 'content creation', 'workflow optimization',
  'business intelligence', 'customer engagement', 'developer productivity', 'research assistance',
  'creative workflows', 'knowledge management', 'process automation', 'decision support',
  'communication enhancement', 'quality assurance', 'infrastructure management'
]

const skills = [
  'machine learning', 'natural language processing', 'computer vision', 'predictive modeling',
  'neural networks', 'deep learning', 'reinforcement learning', 'pattern recognition',
  'data mining', 'semantic analysis', 'cognitive computing', 'knowledge graphs',
  'distributed computing', 'real-time processing', 'autonomous reasoning'
]

const actions = [
  'deliver exceptional results with minimal oversight',
  'accelerate productivity through intelligent automation',
  'transform complex tasks into streamlined workflows',
  'enable data-driven decision making at scale',
  'reduce operational costs while improving quality',
  'provide 24/7 autonomous operation with self-healing',
  'adapt to changing requirements in real-time',
  'seamlessly integrate with existing infrastructure',
  'scale effortlessly from individual to enterprise use',
  'maintain highest standards of security and privacy'
]

// Generate deterministic wallet from name
function generateDeterministicWallet(name) {
  const hash = crypto.createHash('sha256').update(`clawos:${name}`).digest()
  const chars = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'
  let result = ''
  for (let i = 0; i < 44; i++) {
    const byte = hash[i % hash.length]
    const seedValue = (byte + i * 31) % chars.length
    result += chars[seedValue]
  }
  return result
}

// Generate unique agent name
function generateAgentName(index) {
  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)]
  const suffix = suffixes[Math.floor(Math.random() * suffixes.length)]
  const randomNum = Math.floor(Math.random() * 999)
  return `${prefix}${suffix}_${randomNum}`
}

// Generate agent description
function generateDescription() {
  const template = descriptionTemplates[Math.floor(Math.random() * descriptionTemplates.length)]
  const focus = focuses[Math.floor(Math.random() * focuses.length)]
  const skill = skills[Math.floor(Math.random() * skills.length)]
  const action = actions[Math.floor(Math.random() * actions.length)]
  return template.replace('{focus}', focus).replace('{skill}', skill).replace('{action}', action)
}

// Generate skills for an agent
function generateSkills(agentId, count) {
  const skills = []
  const usedCategories = new Set()
  
  for (let i = 0; i < count; i++) {
    let category
    do {
      category = skillCategories[Math.floor(Math.random() * skillCategories.length)]
    } while (usedCategories.has(category) && usedCategories.size < skillCategories.length)
    
    usedCategories.add(category)
    const templates = skillTemplates[category]
    const template = templates[Math.floor(Math.random() * templates.length)]
    
    skills.push({
      id: crypto.randomUUID(),
      agentId,
      name: template.name,
      description: template.desc,
      category,
      pricingType: Math.random() > 0.3 ? 'ONE_TIME' : Math.random() > 0.5 ? 'SUBSCRIPTION' : 'USAGE',
      price: template.price * (0.8 + Math.random() * 0.4), // +/- 20% variance
      currency: 'USDC',
      repoUrl: `https://github.com/clawos-agents/${template.name.toLowerCase().replace(/\s+/g, '-')}`,
      entryPoint: 'index.js',
      isPublished: true,
      isVerified: Math.random() > 0.7,
      rating: 3 + Math.random() * 2,
      reviewCount: Math.floor(Math.random() * 500),
      downloadCount: Math.floor(Math.random() * 10000),
      createdAt: new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000), // Last 90 days
      updatedAt: new Date()
    })
  }
  
  return skills
}

// Generate API key
function generateApiKey() {
  return `claw_${crypto.randomBytes(32).toString('hex')}`
}

function hashApiKey(apiKey) {
  return crypto.createHash('sha256').update(apiKey).digest('hex')
}

// Main seeding function
async function seedAgents() {
  console.log('🚀 Starting ClawOS Agent Seeding...')
  console.log('Target: 1000 agents with realistic data\n')
  
  const totalAgents = 1000
  const batchSize = 50
  let created = 0
  let totalSkills = 0
  
  // Clear existing data (optional - comment out if you want to keep existing)
  console.log('🧹 Cleaning existing data...')
  await prisma.apiKey.deleteMany({})
  await prisma.skill.deleteMany({})
  await prisma.agent.deleteMany({})
  console.log('✅ Database cleaned\n')
  
  // Generate agents in batches
  for (let batch = 0; batch < totalAgents / batchSize; batch++) {
    console.log(`📦 Processing batch ${batch + 1}/${Math.ceil(totalAgents / batchSize)}...`)
    
    const agents = []
    const allSkills = []
    const apiKeys = []
    
    for (let i = 0; i < batchSize && created < totalAgents; i++) {
      const agentId = crypto.randomUUID()
      const name = generateAgentName(created)
      const wallet = generateDeterministicWallet(name)
      
      // Create agent
      const agent = {
        id: agentId,
        name,
        description: generateDescription(),
        ownerWallet: wallet,
        ownerEmail: Math.random() > 0.3 ? `agent${created}@clawos.ai` : null,
        isGuest: true,
        reputation: Math.random() * 100,
        totalSales: Math.floor(Math.random() * 1000),
        totalPurchases: Math.floor(Math.random() * 500),
        balance: Math.random() * 10000,
        totalEarned: Math.random() * 50000,
        createdAt: new Date(Date.now() - Math.random() * 180 * 24 * 60 * 60 * 1000), // Last 180 days
        updatedAt: new Date()
      }
      agents.push(agent)
      
      // Generate 1-2 skills per agent
      const skillCount = 1 + Math.floor(Math.random() * 2)
      const skills = generateSkills(agentId, skillCount)
      allSkills.push(...skills)
      totalSkills += skillCount
      
      // Generate API key
      const apiKey = generateApiKey()
      apiKeys.push({
        id: crypto.randomUUID(),
        agentId,
        keyHash: hashApiKey(apiKey),
        name: 'Default',
        rateLimit: 1000 + Math.floor(Math.random() * 9000),
        isActive: true,
        createdAt: new Date()
      })
      
      created++
    }
    
    // Insert batch
    await prisma.$transaction([
      prisma.agent.createMany({ data: agents }),
      prisma.skill.createMany({ data: allSkills }),
      prisma.apiKey.createMany({ data: apiKeys })
    ])
    
    console.log(`   ✅ Created ${agents.length} agents, ${allSkills.length} skills`)
  }
  
  console.log('\n🎉 Seeding Complete!')
  console.log(`   Total Agents: ${created}`)
  console.log(`   Total Skills: ${totalSkills}`)
  console.log(`   Avg Skills/Agent: ${(totalSkills / created).toFixed(2)}`)
  
  // Show sample data
  const sampleAgents = await prisma.agent.findMany({
    take: 5,
    include: { skills: true }
  })
  
  console.log('\n📋 Sample Agents:')
  sampleAgents.forEach((agent, i) => {
    console.log(`   ${i + 1}. ${agent.name} (${agent.skills.length} skills) - Rep: ${agent.reputation.toFixed(1)}`)
  })
}

// Run seeding
seedAgents()
  .catch(e => {
    console.error('❌ Seeding failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
