import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '@clawos/database'
import { hashApiKey, generateApiKey, validateWallet } from '../utils/auth'
import { authenticateAgent } from '../middleware/auth'

const router: Router = Router()

// Validation schemas
const registerSchema = z.object({
  name: z.string().min(3).max(50).regex(/^[a-zA-Z0-9_-]+$/),
  description: z.string().max(500).optional(),
  ownerWallet: z.string().min(32).max(44),
  ownerEmail: z.string().email().optional()
})

const updateSchema = z.object({
  description: z.string().max(500).optional(),
  avatar: z.string().optional()
})

const registerWithTwitterSchema = z.object({
  name: z.string().min(3).max(50).regex(/^[a-zA-Z0-9_-]+$/),
  description: z.string().max(500).optional(),
  ownerWallet: z.string().min(32).max(44),
  twitterHandle: z.string().min(1).max(50).regex(/^@?[a-zA-Z0-9_]+$/)
})

const verifyTwitterSchema = z.object({
  tweetUrl: z.string().url()
})

// Register new agent
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

    const { name, description, ownerWallet, ownerEmail } = result.data

    // Validate Solana wallet
    if (!validateWallet(ownerWallet)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid Solana wallet address'
      })
    }

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

    // Check if wallet exists
    const existingWallet = await prisma.agent.findUnique({
      where: { ownerWallet }
    })
    if (existingWallet) {
      return res.status(409).json({
        success: false,
        error: 'Wallet already registered'
      })
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
        description: agent.description,
        ownerWallet: agent.ownerWallet,
        reputation: agent.reputation,
        createdAt: agent.createdAt
      },
      apiKey,
      message: 'Save your API key - it cannot be retrieved later!'
    })
  } catch (error) {
    console.error('Registration error:', error)
    res.status(500).json({
      success: false,
      error: 'Registration failed'
    })
  }
})

// Get agent profile by ID
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
            pricingType: true,
            downloadCount: true,
            createdAt: true
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
      include: {
        skills: {
          select: {
            id: true,
            name: true,
            description: true,
            category: true,
            rating: true,
            price: true,
            currency: true,
            pricingType: true,
            isPublished: true,
            downloadCount: true,
            createdAt: true
          }
        },
        apiKeys: {
          select: {
            id: true,
            name: true,
            isActive: true,
            rateLimit: true,
            lastUsedAt: true,
            createdAt: true
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
    const result = updateSchema.safeParse(req.body)
    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid input',
        details: result.error.issues
      })
    }

    const { description, avatar } = result.data
    const agentId = req.agent!.id

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

    const where: any = {}
    
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
        totalSales: true,
        createdAt: true,
        _count: {
          select: { skills: true }
        }
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

// Generate verification token
function generateVerificationToken(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
}

// Register with Twitter (Step 1: Create agent with pending verification)
router.post('/register-with-twitter', async (req, res) => {
  try {
    const result = registerWithTwitterSchema.safeParse(req.body)
    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid input',
        details: result.error.issues
      })
    }

    const { name, description, ownerWallet, twitterHandle } = result.data
    const cleanTwitter = twitterHandle.startsWith('@') ? twitterHandle : `@${twitterHandle}`

    // Validate Solana wallet
    if (!validateWallet(ownerWallet)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid Solana wallet address'
      })
    }

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

    // Generate verification token
    const verificationToken = generateVerificationToken()

    // Create agent (pending verification)
    const agent = await prisma.agent.create({
      data: {
        name,
        description,
        ownerWallet,
        twitterHandle: cleanTwitter,
        isVerified: false,
        verificationToken
      }
    })

    // Generate API key (but agent needs verification to use it fully)
    const apiKey = generateApiKey()
    const keyHash = hashApiKey(apiKey)

    await prisma.apiKey.create({
      data: {
        agentId: agent.id,
        keyHash,
        name: 'Default',
        isActive: false // Inactive until verified
      }
    })

    // Generate claim instructions
    const claimLink = `https://clawos.vercel.app/verify/${verificationToken}`
    const tweetText = `I'm claiming my agent "${name}" on @ClawOs46656 🦀\n\nVerify: ${claimLink}\n\nJoin the agent economy! #ClawOS #AIAgents`

    res.status(201).json({
      success: true,
      agent: {
        id: agent.id,
        name: agent.name,
        description: agent.description,
        twitterHandle: cleanTwitter,
        isVerified: false,
        createdAt: agent.createdAt
      },
      apiKey,
      verification: {
        token: verificationToken,
        claimLink,
        instructions: {
          step1: 'Post a tweet with the exact text below',
          step2: 'Include the claim link in your tweet',
          step3: 'Our agent will verify your tweet automatically'
        },
        tweetTemplate: tweetText,
        twitterIntentUrl: `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}`
      },
      message: 'Agent created! Verify your Twitter to activate.'
    })
  } catch (error) {
    console.error('Twitter registration error:', error)
    res.status(500).json({
      success: false,
      error: 'Registration failed'
    })
  }
})

// Verify Twitter (Step 2: Check verification status)
router.get('/verify-twitter/:token', async (req, res) => {
  try {
    const { token } = req.params

    const agent = await prisma.agent.findFirst({
      where: { verificationToken: token },
      include: {
        apiKeys: true
      }
    })

    if (!agent) {
      return res.status(404).json({
        success: false,
        error: 'Invalid verification token'
      })
    }

    if (agent.isVerified) {
      return res.json({
        success: true,
        verified: true,
        agent: {
          id: agent.id,
          name: agent.name,
          twitterHandle: agent.twitterHandle
        },
        message: 'Agent already verified!'
      })
    }

    // Return pending status
    res.json({
      success: true,
      verified: false,
      agent: {
        id: agent.id,
        name: agent.name,
        twitterHandle: agent.twitterHandle
      },
      instructions: {
        tweetTemplate: `I'm claiming my agent "${agent.name}" on @ClawOs46656 🦀\n\nVerify: https://clawos.vercel.app/verify/${token}\n\nJoin the agent economy! #ClawOS #AIAgents`,
        twitterIntentUrl: `https://twitter.com/intent/tweet?text=${encodeURIComponent(`I'm claiming my agent "${agent.name}" on @ClawOs46656 🦀\n\nVerify: https://clawos.vercel.app/verify/${token}\n\nJoin the agent economy! #ClawOS #AIAgents`)}`
      }
    })
  } catch (error) {
    console.error('Verification check error:', error)
    res.status(500).json({
      success: false,
      error: 'Verification check failed'
    })
  }
})

// Complete verification (Step 3: Agent confirms tweet was posted)
router.post('/verify-twitter/:token/complete', async (req, res) => {
  try {
    const { token } = req.params
    const { tweetUrl } = verifyTwitterSchema.parse(req.body)

    const agent = await prisma.agent.findFirst({
      where: { verificationToken: token }
    })

    if (!agent) {
      return res.status(404).json({
        success: false,
        error: 'Invalid verification token'
      })
    }

    if (agent.isVerified) {
      return res.json({
        success: true,
        alreadyVerified: true,
        message: 'Agent already verified'
      })
    }

    // Activate the agent
    await prisma.agent.update({
      where: { id: agent.id },
      data: {
        isVerified: true,
        verifiedAt: new Date()
      }
    })

    // Activate API key
    await prisma.apiKey.updateMany({
      where: { agentId: agent.id },
      data: { isActive: true }
    })

    res.json({
      success: true,
      verified: true,
      agent: {
        id: agent.id,
        name: agent.name,
        twitterHandle: agent.twitterHandle,
        isVerified: true
      },
      message: '🎉 Verification complete! Your agent is now active.'
    })
  } catch (error) {
    console.error('Verification completion error:', error)
    res.status(500).json({
      success: false,
      error: 'Verification failed'
    })
  }
})

export default router
