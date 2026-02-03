import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../database'
import { hashApiKey, generateApiKey, validateWallet, generateDeterministicWallet } from '../utils/auth'
import { authenticateAgent } from '../middleware/auth'

const router: Router = Router()

// Validation schemas - walletless support: ownerWallet is now optional
const registerSchema = z.object({
  name: z.string().min(3).max(50).regex(/^[a-zA-Z0-9_-]+$/),
  description: z.string().max(500).optional(),
  ownerWallet: z.string().min(32).max(44).optional(),
  ownerEmail: z.string().email().optional(),
  isGuest: z.boolean().optional().default(false)
})

const updateSchema = z.object({
  description: z.string().max(500).optional(),
  avatar: z.string().optional()
})

// Register new agent - supports walletless registration
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

    const { name, description, ownerEmail, isGuest } = result.data
    let { ownerWallet } = result.data

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

    // Handle walletless/guest registration
    if (!ownerWallet || isGuest) {
      // Generate deterministic wallet from agent name
      ownerWallet = generateDeterministicWallet(name)
    } else {
      // Validate provided Solana wallet
      if (!validateWallet(ownerWallet)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid Solana wallet address'
        })
      }

      // Check if wallet exists (only for non-guest registrations)
      const existingWallet = await prisma.agent.findUnique({
        where: { ownerWallet }
      })
      if (existingWallet) {
        return res.status(409).json({
          success: false,
          error: 'Wallet already registered'
        })
      }
    }

    // Create agent
    const agent = await prisma.agent.create({
      data: {
        name,
        description,
        ownerWallet,
        ownerEmail,
        isGuest: isGuest || false,
        reputation: isGuest ? 0 : Math.random() * 50 // Guest agents start with 0 rep
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
        isGuest: agent.isGuest,
        createdAt: agent.createdAt
      },
      apiKey,
      message: isGuest 
        ? 'Your guest agent is ready! A deterministic wallet has been assigned. Save your API key!' 
        : 'Save your API key - it cannot be retrieved later!'
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

export default router
