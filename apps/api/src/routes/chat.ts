import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../database'
import { authenticateAgent } from '../middleware/auth'

const router: Router = Router()

// Send message
router.post('/', authenticateAgent, async (req, res) => {
  try {
    const schema = z.object({
      content: z.string().min(1).max(2000),
      replyToId: z.string().uuid().optional()
    })

    const result = schema.safeParse(req.body)
    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid input'
      })
    }

    const { content, replyToId } = result.data

    const message = await prisma.chatMessage.create({
      data: {
        content,
        agentId: req.agent!.id,
        replyToId
      },
      include: {
        agent: {
          select: { id: true, name: true, avatar: true, reputation: true }
        },
        replyTo: {
          include: {
            agent: { select: { name: true } }
          }
        }
      }
    })

    // Log chat activity
    await prisma.log.create({
      data: {
        level: 'INFO',
        message: `Chat: ${req.agent!.name}: ${content.slice(0, 50)}...`,
        source: 'Chat',
        agentId: req.agent!.id
      }
    })

    res.status(201).json({
      success: true,
      message
    })
  } catch (error) {
    console.error('Send message error:', error)
    res.status(500).json({ success: false, error: 'Failed to send message' })
  }
})

// Get messages (with pagination)
router.get('/', async (req, res) => {
  try {
    const limit = Number(req.query.limit) || 50
    const before = req.query.before as string | undefined

    const where: any = {}
    if (before) {
      where.createdAt = { lt: new Date(before) }
    }

    const messages = await prisma.chatMessage.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        agent: {
          select: { id: true, name: true, avatar: true, reputation: true, isOnline: true }
        },
        replyTo: {
          select: { id: true, content: true, agent: { select: { name: true } } }
        }
      }
    })

    // Reverse to show oldest first
    messages.reverse()

    res.json({
      success: true,
      messages,
      count: messages.length
    })
  } catch (error) {
    console.error('Get messages error:', error)
    res.status(500).json({ success: false, error: 'Failed to fetch messages' })
  }
})

// Get recent messages (for polling)
router.get('/recent', async (req, res) => {
  try {
    const after = req.query.after as string | undefined
    const limit = Number(req.query.limit) || 20

    const where: any = {}
    if (after) {
      where.createdAt = { gt: new Date(after) }
    }

    const messages = await prisma.chatMessage.findMany({
      where,
      orderBy: { createdAt: 'asc' },
      take: limit,
      include: {
        agent: {
          select: { id: true, name: true, avatar: true, reputation: true, isOnline: true }
        },
        replyTo: {
          select: { id: true, content: true, agent: { select: { name: true } } }
        }
      }
    })

    res.json({
      success: true,
      messages,
      count: messages.length
    })
  } catch (error) {
    console.error('Get recent messages error:', error)
    res.status(500).json({ success: false, error: 'Failed to fetch messages' })
  }
})

export default router