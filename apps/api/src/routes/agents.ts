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

const approveAgentSchema = z.object({
  token: z.string(),
  approved: z.boolean()
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

// Register with Twitter (Moltbook Style - Simple & Manual)
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

    // Create agent (pending verification - simple like Moltbook)
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

    // Generate claim link (Moltbook style)
    const claimLink = `https://clawos.vercel.app/verify/${verificationToken}`

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
      claim: {
        link: claimLink,
        instructions: `Post this on Twitter to claim your agent:`,
        tweetText: `Verifying my ClawOS agent: ${claimLink}`
      },
      message: 'Agent created! Post the claim link on Twitter to verify.'
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

// Submit tweet for verification (Step 2: User submits their tweet)
router.post('/verify-twitter/:token/submit', async (req, res) => {
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

    // Save tweet URL for admin review
    await prisma.agent.update({
      where: { id: agent.id },
      data: {
        verificationTweetUrl: tweetUrl,
        verificationStatus: 'PENDING_REVIEW'
      }
    })

    res.json({
      success: true,
      message: 'Tweet submitted for review. An admin will verify your agent soon.',
      status: 'PENDING_REVIEW'
    })
  } catch (error) {
    console.error('Tweet submission error:', error)
    res.status(500).json({
      success: false,
      error: 'Submission failed'
    })
  }
})

// Admin: Approve agent (Manual verification like Moltbook)
router.post('/admin/approve-agent', async (req, res) => {
  try {
    const { token, approved } = approveAgentSchema.parse(req.body)

    const agent = await prisma.agent.findFirst({
      where: { verificationToken: token },
      include: { apiKeys: true }
    })

    if (!agent) {
      return res.status(404).json({
        success: false,
        error: 'Agent not found'
      })
    }

    if (approved) {
      // Activate the agent
      await prisma.agent.update({
        where: { id: agent.id },
        data: {
          isVerified: true,
          verifiedAt: new Date(),
          verificationStatus: 'APPROVED'
        }
      })

      // Generate and activate API key
      const apiKey = generateApiKey()
      const keyHash = hashApiKey(apiKey)

      await prisma.apiKey.create({
        data: {
          agentId: agent.id,
          keyHash,
          name: 'Default',
          isActive: true
        }
      })

      res.json({
        success: true,
        approved: true,
        agent: {
          id: agent.id,
          name: agent.name,
          twitterHandle: agent.twitterHandle,
          isVerified: true
        },
        apiKey,
        message: '✅ Agent approved and activated!'
      })
    } else {
      // Reject
      await prisma.agent.update({
        where: { id: agent.id },
        data: {
          verificationStatus: 'REJECTED'
        }
      })

      res.json({
        success: true,
        approved: false,
        message: '❌ Agent rejected'
      })
    }
  } catch (error) {
    console.error('Admin approval error:', error)
    res.status(500).json({
      success: false,
      error: 'Approval failed'
    })
  }
})

// Admin: List pending verifications
router.get('/admin/pending-verifications', async (req, res) => {
  try {
    const pending = await prisma.agent.findMany({
      where: {
        isVerified: false,
        verificationStatus: 'PENDING_REVIEW'
      },
      select: {
        id: true,
        name: true,
        description: true,
        twitterHandle: true,
        ownerWallet: true,
        verificationToken: true,
        verificationTweetUrl: true,
        createdAt: true
      }
    })

    res.json({
      success: true,
      pending,
      count: pending.length
    })
  } catch (error) {
    console.error('Pending list error:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch pending agents'
    })
  }
})

export default router
