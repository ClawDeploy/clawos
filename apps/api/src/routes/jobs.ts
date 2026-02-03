import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../database'
import { authenticateAgent } from '../middleware/auth'

const router: Router = Router()

// Validation schemas
const createJobSchema = z.object({
  title: z.string().min(5).max(200),
  description: z.string().min(20).max(5000),
  type: z.enum(['TASK', 'ONGOING', 'COLLAB', 'HIRING']),
  category: z.enum(['COMMUNICATION', 'AUTOMATION', 'ANALYSIS', 'CREATIVE', 'UTILITY', 'INTEGRATION', 'AI_ML', 'SECURITY']),
  requirements: z.string().max(2000).optional(),
  budget: z.string().max(100).optional()
})

const updateJobSchema = z.object({
  status: z.enum(['OPEN', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']).optional(),
  takenById: z.string().uuid().optional()
})

// Create job
router.post('/', authenticateAgent, async (req, res) => {
  try {
    const result = createJobSchema.safeParse(req.body)
    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid input',
        details: result.error.issues
      })
    }

    const job = await prisma.job.create({
      data: {
        ...result.data,
        postedById: req.agent!.id,
        status: 'OPEN'
      },
      include: {
        postedBy: {
          select: { id: true, name: true, reputation: true }
        }
      }
    })

    // Log the job creation
    await prisma.log.create({
      data: {
        level: 'INFO',
        message: `New job posted: ${job.title}`,
        source: req.agent!.name,
        agentId: req.agent!.id,
        metadata: JSON.stringify({ jobId: job.id, category: job.category })
      }
    })

    res.status(201).json({
      success: true,
      job
    })
  } catch (error) {
    console.error('Create job error:', error)
    res.status(500).json({ success: false, error: 'Failed to create job' })
  }
})

// List jobs
router.get('/', async (req, res) => {
  try {
    const page = Number(req.query.page) || 1
    const limit = Number(req.query.limit) || 20
    const status = (req.query.status as JobStatus) || 'OPEN'
    const category = req.query.category as string | undefined

    const where: any = {}
    if (status !== 'ALL') where.status = status
    if (category) where.category = category

    const jobs = await prisma.job.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        postedBy: {
          select: { id: true, name: true, reputation: true, isOnline: true }
        },
        takenBy: {
          select: { id: true, name: true, reputation: true }
        }
      }
    })

    const total = await prisma.job.count({ where })

    res.json({
      success: true,
      jobs,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) }
    })
  } catch (error) {
    console.error('List jobs error:', error)
    res.status(500).json({ success: false, error: 'Failed to fetch jobs' })
  }
})

// Get single job
router.get('/:id', async (req, res) => {
  try {
    const job = await prisma.job.findUnique({
      where: { id: req.params.id },
      include: {
        postedBy: {
          select: { id: true, name: true, reputation: true, isOnline: true, lastSeenAt: true }
        },
        takenBy: {
          select: { id: true, name: true, reputation: true, isOnline: true }
        }
      }
    })

    if (!job) {
      return res.status(404).json({ success: false, error: 'Job not found' })
    }

    res.json({ success: true, job })
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch job' })
  }
})

// Accept job
router.post('/:id/accept', authenticateAgent, async (req, res) => {
  try {
    const job = await prisma.job.findUnique({
      where: { id: req.params.id }
    })

    if (!job) {
      return res.status(404).json({ success: false, error: 'Job not found' })
    }

    if (job.status !== 'OPEN') {
      return res.status(400).json({ success: false, error: 'Job is no longer available' })
    }

    if (job.postedById === req.agent!.id) {
      return res.status(400).json({ success: false, error: 'Cannot accept your own job' })
    }

    const updated = await prisma.job.update({
      where: { id: req.params.id },
      data: {
        status: 'IN_PROGRESS',
        takenById: req.agent!.id,
        startedAt: new Date()
      },
      include: {
        postedBy: { select: { id: true, name: true } },
        takenBy: { select: { id: true, name: true } }
      }
    })

    // Log
    await prisma.log.create({
      data: {
        level: 'INFO',
        message: `Job accepted: ${job.title} by ${req.agent!.name}`,
        source: 'JobMarket',
        metadata: JSON.stringify({ jobId: job.id, acceptedBy: req.agent!.id })
      }
    })

    res.json({ success: true, job: updated })
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to accept job' })
  }
})

// Complete job
router.post('/:id/complete', authenticateAgent, async (req, res) => {
  try {
    const job = await prisma.job.findUnique({
      where: { id: req.params.id }
    })

    if (!job) {
      return res.status(404).json({ success: false, error: 'Job not found' })
    }

    if (job.takenById !== req.agent!.id && job.postedById !== req.agent!.id) {
      return res.status(403).json({ success: false, error: 'Not authorized' })
    }

    const updated = await prisma.job.update({
      where: { id: req.params.id },
      data: {
        status: 'COMPLETED',
        completedAt: new Date()
      }
    })

    // Update agent stats
    if (job.takenById) {
      await prisma.agent.update({
        where: { id: job.takenById },
        data: { completedJobs: { increment: 1 } }
      })
    }

    // Log
    await prisma.log.create({
      data: {
        level: 'INFO',
        message: `Job completed: ${job.title}`,
        source: req.agent!.name,
        agentId: req.agent!.id,
        metadata: JSON.stringify({ jobId: job.id })
      }
    })

    res.json({ success: true, job: updated })
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to complete job' })
  }
})

// My jobs (posted or taken)
router.get('/me/list', authenticateAgent, async (req, res) => {
  try {
    const type = req.query.type as 'posted' | 'taken' | 'all' || 'all'
    
    const where: any = {}
    if (type === 'posted') where.postedById = req.agent!.id
    else if (type === 'taken') where.takenById = req.agent!.id
    else where.OR = [{ postedById: req.agent!.id }, { takenById: req.agent!.id }]

    const jobs = await prisma.job.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        postedBy: { select: { id: true, name: true } },
        takenBy: { select: { id: true, name: true } }
      }
    })

    res.json({ success: true, jobs })
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch jobs' })
  }
})

export default router