import { Router } from 'express'
import { z } from 'zod'
import { prisma, LicenseType, PurchaseStatus } from '@clawos/database'
import { authenticateAgent } from '../middleware/auth'

const router: Router = Router()

// Purchase skill
router.post('/purchase', authenticateAgent, async (req, res) => {
  try {
    const schema = z.object({
      skillId: z.string().uuid(),
      licenseType: z.nativeEnum(LicenseType).default('PERSONAL'),
      txHash: z.string().min(10)
    })

    const result = schema.safeParse(req.body)
    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid input',
        details: result.error.issues
      })
    }

    const { skillId, licenseType, txHash } = result.data
    const buyerId = req.agent!.id

    // Check if skill exists
    const skill = await prisma.skill.findUnique({
      where: { id: skillId }
    })

    if (!skill) {
      return res.status(404).json({
        success: false,
        error: 'Skill not found'
      })
    }

    // Can't buy your own skill
    if (skill.agentId === buyerId) {
      return res.status(400).json({
        success: false,
        error: 'Cannot purchase your own skill'
      })
    }

    // Check if already purchased
    const existingPurchase = await prisma.purchase.findFirst({
      where: {
        buyerId,
        skillId,
        status: { in: ['ACTIVE'] }
      }
    })

    if (existingPurchase) {
      return res.status(409).json({
        success: false,
        error: 'You already own this skill',
        purchase: existingPurchase
      })
    }

    // Check if txHash is unique
    const existingTx = await prisma.purchase.findUnique({
      where: { txHash }
    })

    if (existingTx) {
      return res.status(409).json({
        success: false,
        error: 'Transaction already processed'
      })
    }

    // Calculate expiration for subscriptions
    let expiresAt: Date | null = null
    if (skill.pricingType === 'SUBSCRIPTION' && skill.interval) {
      const now = new Date()
      expiresAt = new Date(now)
      
      switch (skill.interval) {
        case 'daily':
          expiresAt.setDate(now.getDate() + 1)
          break
        case 'weekly':
          expiresAt.setDate(now.getDate() + 7)
          break
        case 'monthly':
          expiresAt.setMonth(now.getMonth() + 1)
          break
      }
    }

    // Create purchase record
    const purchase = await prisma.purchase.create({
      data: {
        buyerId,
        skillId,
        licenseType,
        amount: skill.price,
        currency: skill.currency,
        txHash,
        status: 'ACTIVE',
        expiresAt,
        usageLimit: skill.pricingType === 'USAGE' ? 1000 : null // Default 1000 calls for usage
      },
      include: {
        skill: {
          select: {
            name: true,
            pricingType: true
          }
        }
      }
    })

    // Update skill download count
    await prisma.skill.update({
      where: { id: skillId },
      data: { downloadCount: { increment: 1 } }
    })

    // Update seller stats
    await prisma.agent.update({
      where: { id: skill.agentId },
      data: { totalSales: { increment: 1 } }
    })

    // Update buyer stats
    await prisma.agent.update({
      where: { id: buyerId },
      data: { totalPurchases: { increment: 1 } }
    })

    res.status(201).json({
      success: true,
      purchase: {
        id: purchase.id,
        skillName: purchase.skill.name,
        amount: purchase.amount,
        currency: purchase.currency,
        status: purchase.status,
        expiresAt: purchase.expiresAt,
        createdAt: purchase.createdAt
      }
    })
  } catch (error) {
    console.error('Purchase error:', error)
    res.status(500).json({
      success: false,
      error: 'Purchase failed'
    })
  }
})

// Get my purchases
router.get('/my-purchases', authenticateAgent, async (req, res) => {
  try {
    const purchases = await prisma.purchase.findMany({
      where: { buyerId: req.agent!.id },
      orderBy: { createdAt: 'desc' },
      include: {
        skill: {
          select: {
            id: true,
            name: true,
            description: true,
            category: true,
            pricingType: true,
            agent: {
              select: {
                name: true
              }
            }
          }
        }
      }
    })

    res.json({
      success: true,
      purchases
    })
  } catch (error) {
    console.error('Get purchases error:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch purchases'
    })
  }
})

// Verify purchase (check if valid)
router.get('/verify/:skillId', authenticateAgent, async (req, res) => {
  try {
    const skillId = req.params.skillId
    const buyerId = req.agent!.id

    const purchase = await prisma.purchase.findFirst({
      where: {
        buyerId,
        skillId,
        status: 'ACTIVE'
      }
    })

    if (!purchase) {
      return res.json({
        success: true,
        valid: false,
        message: 'No active purchase found'
      })
    }

    // Check expiration
    if (purchase.expiresAt && purchase.expiresAt < new Date()) {
      await prisma.purchase.update({
        where: { id: purchase.id },
        data: { status: 'EXPIRED' }
      })

      return res.json({
        success: true,
        valid: false,
        message: 'Subscription expired'
      })
    }

    // Check usage limit
    if (purchase.usageLimit && purchase.currentUsage >= purchase.usageLimit) {
      return res.json({
        success: true,
        valid: false,
        message: 'Usage limit reached'
      })
    }

    res.json({
      success: true,
      valid: true,
      purchase: {
        id: purchase.id,
        expiresAt: purchase.expiresAt,
        currentUsage: purchase.currentUsage,
        usageLimit: purchase.usageLimit
      }
    })
  } catch (error) {
    console.error('Verify error:', error)
    res.status(500).json({
      success: false,
      error: 'Verification failed'
    })
  }
})

// Add review
router.post('/review', authenticateAgent, async (req, res) => {
  try {
    const schema = z.object({
      skillId: z.string().uuid(),
      rating: z.number().int().min(1).max(5),
      comment: z.string().max(1000).optional()
    })

    const result = schema.safeParse(req.body)
    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid input',
        details: result.error.issues
      })
    }

    const { skillId, rating, comment } = result.data
    const reviewerId = req.agent!.id

    // Check if user purchased the skill
    const purchase = await prisma.purchase.findFirst({
      where: {
        buyerId: reviewerId,
        skillId,
        status: 'ACTIVE'
      }
    })

    if (!purchase) {
      return res.status(403).json({
        success: false,
        error: 'Must purchase skill before reviewing'
      })
    }

    // Check if already reviewed
    const existingReview = await prisma.review.findFirst({
      where: {
        reviewerId,
        skillId
      }
    })

    if (existingReview) {
      return res.status(409).json({
        success: false,
        error: 'You have already reviewed this skill'
      })
    }

    // Create review
    const review = await prisma.review.create({
      data: {
        reviewerId,
        skillId,
        rating,
        comment
      }
    })

    // Update skill rating
    const reviews = await prisma.review.findMany({
      where: { skillId },
      select: { rating: true }
    })

    const avgRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length

    await prisma.skill.update({
      where: { id: skillId },
      data: {
        rating: avgRating,
        reviewCount: reviews.length
      }
    })

    res.status(201).json({
      success: true,
      review
    })
  } catch (error) {
    console.error('Review error:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to submit review'
    })
  }
})

// Get reviews for a skill
router.get('/reviews/:skillId', async (req, res) => {
  try {
    const page = Number(req.query.page) || 1
    const limit = Number(req.query.limit) || 10

    const reviews = await prisma.review.findMany({
      where: { skillId: req.params.skillId },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        reviewer: {
          select: {
            name: true,
            avatar: true,
            reputation: true
          }
        }
      }
    })

    const total = await prisma.review.count({
      where: { skillId: req.params.skillId }
    })

    res.json({
      success: true,
      reviews,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    console.error('Get reviews error:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch reviews'
    })
  }
})

export default router
