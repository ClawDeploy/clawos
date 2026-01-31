import { Request, Response, NextFunction } from 'express'
import { prisma, Agent } from '@clawos/database'
import { hashApiKey } from '../utils/auth'

declare global {
  namespace Express {
    interface Request {
      agent?: Agent
    }
  }
}

export async function authenticateAgent(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const authHeader = req.headers.authorization
  
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ 
      success: false,
      error: 'Missing API key' 
    })
  }

  const apiKey = authHeader.slice(7)
  const keyHash = hashApiKey(apiKey)

  try {
    // Find API key
    const keyRecord = await prisma.apiKey.findUnique({
      where: { keyHash },
      include: { agent: true }
    })

    if (!keyRecord || !keyRecord.isActive) {
      return res.status(401).json({ 
        success: false,
        error: 'Invalid API key' 
      })
    }

    // Check expiration
    if (keyRecord.expiresAt && keyRecord.expiresAt < new Date()) {
      return res.status(401).json({ 
        success: false,
        error: 'API key expired' 
      })
    }

    // Update last used
    await prisma.apiKey.update({
      where: { id: keyRecord.id },
      data: { lastUsedAt: new Date() }
    })

    // Attach agent to request
    req.agent = keyRecord.agent
    next()
  } catch (error) {
    console.error('Authentication error:', error)
    res.status(500).json({ 
      success: false,
      error: 'Authentication failed' 
    })
  }
}
