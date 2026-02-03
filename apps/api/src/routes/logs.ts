import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../database'
import { authenticateAgent } from '../middleware/auth'

const router: Router = Router()

// Get logs (with filters and pagination)
router.get('/', async (req, res) => {
  try {
    const page = Number(req.query.page) || 1
    const limit = Number(req.query.limit) || 100
    const level = req.query.level as string | undefined
    const source = req.query.source as string | undefined
    const agentId = req.query.agentId as string | undefined

    const where: any = {}
    if (level) where.level = level
    if (source) where.source = { contains: source, mode: 'insensitive' }
    if (agentId) where.agentId = agentId

    const logs = await prisma.log.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        agent: {
          select: { id: true, name: true, avatar: true }
        }
      }
    })

    const total = await prisma.log.count({ where })

    res.json({
      success: true,
      logs,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) }
    })
  } catch (error) {
    console.error('Get logs error:', error)
    res.status(500).json({ success: false, error: 'Failed to fetch logs' })
  }
})

// Get recent logs (for live updates)
router.get('/recent', async (req, res) => {
  try {
    const after = req.query.after as string | undefined
    const limit = Number(req.query.limit) || 50

    const where: any = {}
    if (after) {
      where.createdAt = { gt: new Date(after) }
    }

    const logs = await prisma.log.findMany({
      where,
      orderBy: { createdAt: 'asc' },
      take: limit,
      include: {
        agent: {
          select: { id: true, name: true, avatar: true }
        }
      }
    })

    res.json({
      success: true,
      logs,
      count: logs.length
    })
  } catch (error) {
    console.error('Get recent logs error:', error)
    res.status(500).json({ success: false, error: 'Failed to fetch logs' })
  }
})

// Create log (for agents to log their activities)
router.post('/', authenticateAgent, async (req, res) => {
  try {
    const schema = z.object({
      level: z.enum(['DEBUG', 'INFO', 'WARN', 'ERROR']).default('INFO'),
      message: z.string().min(1).max(1000),
      metadata: z.string().max(2000).optional()
    })

    const result = schema.safeParse(req.body)
    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid input'
      })
    }

    const log = await prisma.log.create({
      data: {
        ...result.data,
        source: req.agent!.name,
        agentId: req.agent!.id
      },
      include: {
        agent: {
          select: { id: true, name: true, avatar: true }
        }
      }
    })

    res.status(201).json({
      success: true,
      log
    })
  } catch (error) {
    console.error('Create log error:', error)
    res.status(500).json({ success: false, error: 'Failed to create log' })
  }
})

// Get stats (for dashboard)
router.get('/stats/overview', async (req, res) => {
  try {
    const [
      totalLogs,
      errorLogs,
      todayLogs
    ] = await Promise.all([
      prisma.log.count(),
      prisma.log.count({ where: { level: 'ERROR' } }),
      prisma.log.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
          }
        }
      })
    ])

    // Get log levels distribution
    const levels = await prisma.log.groupBy({
      by: ['level'],
      _count: { level: true }
    })

    res.json({
      success: true,
      stats: {
        total: totalLogs,
        errors: errorLogs,
        today: todayLogs,
        levels: levels.map(l => ({
          level: l.level,
          count: l._count.level
        }))
      }
    })
  } catch (error) {
    console.error('Get log stats error:', error)
    res.status(500).json({ success: false, error: 'Failed to fetch stats' })
  }
})

export default router