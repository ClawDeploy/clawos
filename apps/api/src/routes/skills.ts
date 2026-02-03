import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../database'
import { authenticateAgent } from '../middleware/auth'

const router: Router = Router()

// Validation schemas
const createSkillSchema = z.object({
  name: z.string().min(3).max(100),
  version: z.string().default('1.0.0'),
  description: z.string().min(10).max(2000),
  category: z.enum(['COMMUNICATION', 'AUTOMATION', 'ANALYSIS', 'CREATIVE', 'UTILITY', 'INTEGRATION', 'AI_ML', 'SECURITY']),
  tags: z.array(z.string().max(30)).max(10).optional(),
  apiEndpoint: z.string().url().optional(),
  repoUrl: z.string().url().optional(),
  documentation: z.string().optional()
})

const endpointSchema = z.object({
  path: z.string().min(1).max(100),
  method: z.enum(['GET', 'POST', 'PUT', 'DELETE', 'PATCH']),
  description: z.string().max(500).optional(),
  parameters: z.string().optional() // JSON schema
})

// Create skill - for agents to upload their skills
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

    const { name, version, description, category, tags, apiEndpoint, repoUrl, documentation } = result.data
    const agentId = req.agent!.id

    // Check if skill name exists for this agent
    const existing = await prisma.skill.findFirst({
      where: { name, agentId }
    })

    if (existing) {
      return res.status(409).json({
        success: false,
        error: 'You already have a skill with this name'
      })
    }

    // Create skill
    const skill = await prisma.skill.create({
      data: {
        name,
        version,
        description,
        category,
        tags: tags || [],
        apiEndpoint,
        repoUrl,
        documentation,
        agentId,
        isPublished: true
      },
      include: {
        endpoints: true,
        agent: {
          select: { id: true, name: true, reputation: true }
        }
      }
    })

    // Update agent skill count
    await prisma.agent.update({
      where: { id: agentId },
      data: { skillCount: { increment: 1 } }
    })

    // Log skill creation
    await prisma.log.create({
      data: {
        level: 'INFO',
        message: `New skill published: ${skill.name}`,
        source: req.agent!.name,
        agentId: req.agent!.id,
        metadata: JSON.stringify({ skillId: skill.id, category })
      }
    })

    res.status(201).json({
      success: true,
      skill,
      message: 'Skill published successfully!'
    })
  } catch (error) {
    console.error('Skill creation error:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to create skill'
    })
  }
})

// Add endpoint to skill
router.post('/:id/endpoints', authenticateAgent, async (req, res) => {
  try {
    const skillId = req.params.id
    const agentId = req.agent!.id

    // Verify ownership
    const skill = await prisma.skill.findFirst({
      where: { id: skillId, agentId }
    })

    if (!skill) {
      return res.status(404).json({
        success: false,
        error: 'Skill not found or not owned by you'
      })
    }

    const result = endpointSchema.safeParse(req.body)
    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid input',
        details: result.error.issues
      })
    }

    const endpoint = await prisma.skillEndpoint.create({
      data: {
        ...result.data,
        skillId
      }
    })

    res.status(201).json({
      success: true,
      endpoint
    })
  } catch (error) {
    console.error('Endpoint creation error:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to create endpoint'
    })
  }
})

// List all skills
router.get('/', async (req, res) => {
  try {
    const category = req.query.category as string | undefined
    const search = req.query.search as string | undefined
    const page = Number(req.query.page) || 1
    const limit = Math.min(Number(req.query.limit) || 20, 100)

    const where: any = {
      isPublished: true
    }

    if (category && category !== 'ALL') {
      where.category = category
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { tags: { has: search } }
      ]
    }

    const skills = await prisma.skill.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        agent: {
          select: { id: true, name: true, reputation: true, isOnline: true }
        },
        endpoints: {
          select: { id: true, path: true, method: true }
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
          select: { id: true, name: true, description: true, reputation: true, avatar: true }
        },
        endpoints: true
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
        endpoints: true
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
      version: z.string().optional(),
      documentation: z.string().optional(),
      apiEndpoint: z.string().url().optional()
    })

    const result = updateSchema.safeParse(req.body)
    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid input'
      })
    }

    const skill = await prisma.skill.update({
      where: { id: skillId },
      data: result.data,
      include: { endpoints: true }
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

    await prisma.skill.delete({ where: { id: skillId } })

    // Update agent skill count
    await prisma.agent.update({
      where: { id: agentId },
      data: { skillCount: { decrement: 1 } }
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

// Increment use count (called when skill is used)
router.post('/:id/use', async (req, res) => {
  try {
    await prisma.skill.update({
      where: { id: req.params.id },
      data: { useCount: { increment: 1 } }
    })

    res.json({ success: true })
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to update' })
  }
})

export default router