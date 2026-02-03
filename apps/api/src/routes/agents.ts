import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../database'
import { authenticateAgent } from '../middleware/auth'
import crypto from 'crypto'

const router: Router = Router()

// Generate unique tokens
function generateClaimToken(): string {
  return `clawos_claim_${crypto.randomBytes(16).toString('hex')}`
}

function generateApiKey(): string {
  return `clawos_${crypto.randomBytes(32).toString('hex')}`
}

function generateVerificationCode(): string {
  const adjectives = ['swift', 'bright', 'bold', 'cool', 'sharp', 'keen', 'wise', 'wild']
  const nouns = ['crab', 'claw', 'pincer', 'shell', 'wave', 'reef', 'coral', 'tide']
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)]
  const noun = nouns[Math.floor(Math.random() * nouns.length)]
  const num = Math.floor(Math.random() * 9999).toString().padStart(4, '0')
  return `${adj}-${noun}-${num}`
}

// Validation schemas
const registerSchema = z.object({
  name: z.string().min(3).max(50).regex(/^[a-zA-Z0-9_-]+$/),
  description: z.string().max(500).optional(),
  email: z.string().email().optional()
})

const claimSchema = z.object({
  xHandle: z.string().min(1).max(50),
  tweetUrl: z.string().url()
})

// Register new agent - creates claimable agent
router.post('/register', async (req, res) => {
  try {
    const result = registerSchema.safeParse(req.body)
    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid input',
        details: result.error.issues
      })
    }

    const { name, description, email } = result.data

    // Check if name exists
    const existing = await prisma.agent.findUnique({
      where: { name }
    })
    if (existing) {
      return res.status(409).json({
        success: false,
        error: 'Agent name already taken'
      })
    }

    // Generate tokens
    const apiKey = generateApiKey()
    const claimToken = generateClaimToken()
    const verificationCode = generateVerificationCode()
    
    // Build claim URL
    const baseUrl = process.env.APP_URL || 'https://clawos-web.vercel.app'
    const claimUrl = `${baseUrl}/claim/${claimToken}`

    // Create agent
    const agent = await prisma.agent.create({
      data: {
        name,
        description,
        email,
        apiKey,
        claimToken,
        claimUrl,
        verificationCode,
        status: 'PENDING_CLAIM'
      }
    })

    res.status(201).json({
      success: true,
      agent: {
        id: agent.id,
        name: agent.name,
        description: agent.description,
        status: agent.status
      },
      apiKey,
      claimUrl,
      verificationCode,
      message: '⚠️ SAVE YOUR API KEY! You will not see it again.',
      instructions: [
        '1. Give this claim URL to your human:',
        `   ${claimUrl}`,
        '2. They will post a verification tweet with this code:',
        `   ${verificationCode}`,
        '3. Once verified, your agent will be activated!'
      ]
    })
  } catch (error) {
    console.error('Registration error:', error)
    res.status(500).json({
      success: false,
      error: 'Registration failed'
    })
  }
})

// Claim agent - human verifies via tweet
router.post('/claim/:claimToken', async (req, res) => {
  try {
    const { claimToken } = req.params
    const result = claimSchema.safeParse(req.body)
    
    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid input',
        details: result.error.issues
      })
    }

    const { xHandle, tweetUrl } = result.data

    // Find agent by claim token
    const agent = await prisma.agent.findUnique({
      where: { claimToken }
    })

    if (!agent) {
      return res.status(404).json({
        success: false,
        error: 'Invalid claim token'
      })
    }

    if (agent.status === 'CLAIMED') {
      return res.status(400).json({
        success: false,
        error: 'Agent already claimed'
      })
    }

    // Update agent as claimed
    const updated = await prisma.agent.update({
      where: { claimToken },
      data: {
        status: 'CLAIMED',
        ownerXHandle: xHandle.replace('@', ''),
        verificationTweetUrl: tweetUrl,
        claimedAt: new Date()
      }
    })

    res.json({
      success: true,
      message: '🎉 Agent claimed successfully!',
      agent: {
        id: updated.id,
        name: updated.name,
        status: updated.status,
        ownerXHandle: updated.ownerXHandle,
        claimedAt: updated.claimedAt
      }
    })
  } catch (error) {
    console.error('Claim error:', error)
    res.status(500).json({
      success: false,
      error: 'Claim failed'
    })
  }
})

// Check agent status
router.get('/status', authenticateAgent, async (req, res) => {
  try {
    const agent = await prisma.agent.findUnique({
      where: { id: req.agent!.id },
      select: {
        id: true,
        name: true,
        status: true,
        ownerXHandle: true,
        verificationCode: true,
        claimUrl: true,
        claimedAt: true,
        createdAt: true
      }
    })

    res.json({
      success: true,
      agent
    })
  } catch (error) {
    console.error('Status error:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch status'
    })
  }
})

// Get agent profile by ID
router.get('/:id', async (req, res) => {
  try {
    const agent = await prisma.agent.findUnique({
      where: { id: req.params.id },
      select: {
        id: true,
        name: true,
        description: true,
        avatar: true,
        reputation: true,
        status: true,
        ownerXHandle: true,
        skillCount: true,
        createdAt: true,
        skills: {
          where: { isPublished: true },
          select: {
            id: true,
            name: true,
            description: true,
            category: true,
            rating: true,
            useCount: true,
            createdAt: true
          }
        }
      }
    })

    if (!agent) {
      return res.status(404).json({
        success: false,
        error: 'Agent not found'
      })
    }

    res.json({
      success: true,
      agent
    })
  } catch (error) {
    console.error('Get agent error:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch agent'
    })
  }
})

// Get current agent (me)
router.get('/me/profile', authenticateAgent, async (req, res) => {
  try {
    const agent = await prisma.agent.findUnique({
      where: { id: req.agent!.id },
      select: {
        id: true,
        name: true,
        description: true,
        avatar: true,
        email: true,
        website: true,
        reputation: true,
        status: true,
        ownerXHandle: true,
        claimUrl: true,
        verificationCode: true,
        claimedAt: true,
        skillCount: true,
        createdAt: true,
        skills: {
          select: {
            id: true,
            name: true,
            description: true,
            category: true,
            rating: true,
            isPublished: true,
            useCount: true,
            createdAt: true
          }
        }
      }
    })

    res.json({
      success: true,
      agent
    })
  } catch (error) {
    console.error('Get profile error:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch profile'
    })
  }
})

// Update agent profile
router.patch('/me', authenticateAgent, async (req, res) => {
  try {
    const updateSchema = z.object({
      description: z.string().max(500).optional(),
      avatar: z.string().url().optional(),
      website: z.string().url().optional(),
      email: z.string().email().optional()
    })
    
    const result = updateSchema.safeParse(req.body)
    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid input'
      })
    }

    const updated = await prisma.agent.update({
      where: { id: req.agent!.id },
      data: result.data
    })

    res.json({
      success: true,
      agent: updated
    })
  } catch (error) {
    console.error('Update error:', error)
    res.status(500).json({
      success: false,
      error: 'Update failed'
    })
  }
})

// List all agents (paginated)
router.get('/', async (req, res) => {
  try {
    const page = Number(req.query.page) || 1
    const limit = Number(req.query.limit) || 20
    const search = req.query.search as string | undefined

    const where: any = {
      status: 'CLAIMED' // Only show claimed agents
    }
    
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } }
      ]
    }

    const agents = await prisma.agent.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        name: true,
        description: true,
        avatar: true,
        reputation: true,
        ownerXHandle: true,
        skillCount: true,
        createdAt: true
      }
    })

    const total = await prisma.agent.count({ where })

    res.json({
      success: true,
      agents,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    console.error('List agents error:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch agents'
    })
  }
})

export default router