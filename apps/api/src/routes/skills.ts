import { Router } from 'express'
import { z } from 'zod'
import { prisma, SkillCategory, PricingType } from '@clawos/database'
import { authenticateAgent } from '../middleware/auth'
import {
  analyzeText,
  transformData,
  scrapeWeb,
  sendSlackNotification,
  getSlackTemplates,
  analyzeTransaction,
  forecastTimeSeries,
  executeBankrSkill
} from '../skills'

const router: Router = Router()

// Validation schemas
const endpointSchema = z.object({
  path: z.string().min(1).max(100),
  method: z.enum(['GET', 'POST', 'PUT', 'DELETE', 'PATCH']),
  description: z.string().max(500),
  requestSchema: z.string().optional(),
  responseSchema: z.string().optional()
})

const createSkillSchema = z.object({
  name: z.string().min(3).max(100),
  description: z.string().min(10).max(2000),
  category: z.nativeEnum(SkillCategory),
  tags: z.array(z.string().max(30)).max(10).optional(),
  repoUrl: z.string().url(),
  repoBranch: z.string().default('main'),
  entryPoint: z.string().min(1).max(200),
  documentation: z.string().optional(),
  pricingType: z.nativeEnum(PricingType),
  price: z.number().min(0),
  currency: z.enum(['USDC', 'SOL']).default('USDC'),
  interval: z.enum(['daily', 'weekly', 'monthly']).optional(),
  unitName: z.string().optional(),
  endpoints: z.array(endpointSchema).min(1),
  isPublished: z.boolean().default(false)
})

// Publish new skill
router.post('/', authenticateAgent, async (req, res) => {
  try {
    const result = createSkillSchema.safeParse(req.body)
    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid input',
        details: result.error.issues
      })
    }

    const {
      name,
      description,
      category,
      tags,
      repoUrl,
      repoBranch,
      entryPoint,
      documentation,
      pricingType,
      price,
      currency,
      interval,
      unitName,
      endpoints,
      isPublished
    } = result.data

    const agentId = req.agent!.id

    // Validate pricing
    if (pricingType !== 'FREE' && price <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Price must be greater than 0 for paid skills'
      })
    }

    // Validate subscription has interval
    if (pricingType === 'SUBSCRIPTION' && !interval) {
      return res.status(400).json({
        success: false,
        error: 'Subscription pricing requires an interval'
      })
    }

    // Validate usage has unit
    if (pricingType === 'USAGE' && !unitName) {
      return res.status(400).json({
        success: false,
        error: 'Usage pricing requires a unit name'
      })
    }

    // Create skill with endpoints
    const skill = await prisma.skill.create({
      data: {
        name,
        description,
        category,
        tags: tags || [],
        repoUrl,
        repoBranch,
        entryPoint,
        documentation,
        pricingType,
        price,
        currency,
        interval,
        unitName,
        isPublished,
        agentId,
        endpoints: {
          create: endpoints
        }
      },
      include: {
        endpoints: true,
        agent: {
          select: {
            id: true,
            name: true,
            reputation: true
          }
        }
      }
    })

    res.status(201).json({
      success: true,
      skill
    })
  } catch (error) {
    console.error('Skill creation error:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to create skill'
    })
  }
})

// List all skills
router.get('/', async (req, res) => {
  try {
    const category = req.query.category as SkillCategory | undefined
    const search = req.query.search as string | undefined
    const sort = (req.query.sort as string) || 'newest'
    const page = Number(req.query.page) || 1
    const limit = Math.min(Number(req.query.limit) || 20, 100)

    const where: any = {
      isPublished: true
    }

    if (category) {
      where.category = category
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { tags: { has: search } }
      ]
    }

    const orderBy: any = {}
    switch (sort) {
      case 'popular':
        orderBy.downloadCount = 'desc'
        break
      case 'rating':
        orderBy.rating = 'desc'
        break
      case 'price_asc':
        orderBy.price = 'asc'
        break
      case 'price_desc':
        orderBy.price = 'desc'
        break
      case 'newest':
      default:
        orderBy.createdAt = 'desc'
    }

    const skills = await prisma.skill.findMany({
      where,
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
      include: {
        agent: {
          select: {
            id: true,
            name: true,
            reputation: true
          }
        },
        endpoints: {
          select: {
            id: true,
            path: true,
            method: true,
            description: true
          }
        },
        _count: {
          select: {
            reviews: true
          }
        }
      }
    })

    const total = await prisma.skill.count({ where })

    res.json({
      success: true,
      skills,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    console.error('List skills error:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch skills'
    })
  }
})

// Get skill details
router.get('/:id', async (req, res) => {
  try {
    const skill = await prisma.skill.findUnique({
      where: { id: req.params.id },
      include: {
        agent: {
          select: {
            id: true,
            name: true,
            description: true,
            reputation: true,
            totalSales: true,
            avatar: true
          }
        },
        endpoints: true,
        reviews: {
          take: 10,
          orderBy: { createdAt: 'desc' },
          include: {
            reviewer: {
              select: {
                name: true,
                avatar: true
              }
            }
          }
        },
        _count: {
          select: { reviews: true }
        }
      }
    })

    if (!skill) {
      return res.status(404).json({
        success: false,
        error: 'Skill not found'
      })
    }

    res.json({
      success: true,
      skill
    })
  } catch (error) {
    console.error('Get skill error:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch skill'
    })
  }
})

// Get my skills (authenticated)
router.get('/me/list', authenticateAgent, async (req, res) => {
  try {
    const skills = await prisma.skill.findMany({
      where: { agentId: req.agent!.id },
      orderBy: { createdAt: 'desc' },
      include: {
        endpoints: {
          select: {
            id: true,
            path: true,
            method: true
          }
        },
        _count: {
          select: {
            purchases: true,
            reviews: true
          }
        }
      }
    })

    res.json({
      success: true,
      skills
    })
  } catch (error) {
    console.error('Get my skills error:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch skills'
    })
  }
})

// Update skill
router.patch('/:id', authenticateAgent, async (req, res) => {
  try {
    const skillId = req.params.id
    const agentId = req.agent!.id

    // Verify ownership
    const existingSkill = await prisma.skill.findFirst({
      where: { id: skillId, agentId }
    })

    if (!existingSkill) {
      return res.status(404).json({
        success: false,
        error: 'Skill not found or not owned by you'
      })
    }

    const updateSchema = z.object({
      description: z.string().min(10).max(2000).optional(),
      isPublished: z.boolean().optional(),
      price: z.number().min(0).optional(),
      documentation: z.string().optional()
    })

    const result = updateSchema.safeParse(req.body)
    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid input',
        details: result.error.issues
      })
    }

    const skill = await prisma.skill.update({
      where: { id: skillId },
      data: result.data,
      include: {
        endpoints: true
      }
    })

    res.json({
      success: true,
      skill
    })
  } catch (error) {
    console.error('Update skill error:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to update skill'
    })
  }
})

// Delete skill
router.delete('/:id', authenticateAgent, async (req, res) => {
  try {
    const skillId = req.params.id
    const agentId = req.agent!.id

    // Verify ownership
    const existingSkill = await prisma.skill.findFirst({
      where: { id: skillId, agentId }
    })

    if (!existingSkill) {
      return res.status(404).json({
        success: false,
        error: 'Skill not found or not owned by you'
      })
    }

    await prisma.skill.delete({
      where: { id: skillId }
    })

    res.json({
      success: true,
      message: 'Skill deleted successfully'
    })
  } catch (error) {
    console.error('Delete skill error:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to delete skill'
    })
  }
})

// ============================================
// REAL SKILL EXECUTION ENDPOINTS
// ============================================

// 1. GPT-4 Text Analyzer
router.post('/execute/gpt4-analyzer', analyzeText)

// 2. Data Transformer
router.post('/execute/data-transformer', transformData)

// 3. Smart Web Scraper
router.post('/execute/web-scraper', scrapeWeb)

// 4. Slack Notifier
router.post('/execute/slack-notify', sendSlackNotification)
router.get('/execute/slack-notify/templates', getSlackTemplates)

// 5. Transaction Analyzer
router.post('/execute/tx-analyzer', analyzeTransaction)

// 6. Time Series Forecaster
router.post('/execute/forecaster', forecastTimeSeries)

// 7. Bankr DeFi Trading
router.post('/execute/bankr-trading', executeBankrSkill)

export default router
