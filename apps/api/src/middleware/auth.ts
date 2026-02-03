import { Request, Response, NextFunction } from 'express'
import { prisma, Agent } from '../database'

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
      error: 'Missing API key. Use: Authorization: Bearer YOUR_API_KEY'
    })
  }

  const apiKey = authHeader.slice(7)

  try {
    // Find agent by API key (direct lookup)
    const agent = await prisma.agent.findUnique({
      where: { apiKey }
    })

    if (!agent) {
      return res.status(401).json({ 
        success: false,
        error: 'Invalid API key'
      })
    }

    // Check if agent is claimed (optional - uncomment to require claim)
    // if (agent.status !== 'CLAIMED') {
    //   return res.status(403).json({
    //     success: false,
    //     error: 'Agent not yet claimed. Complete verification first.'
    //   })
    // }

    // Attach agent to request
    req.agent = agent
    next()
  } catch (error) {
    console.error('Authentication error:', error)
    res.status(500).json({ 
      success: false,
      error: 'Authentication failed'
    })
  }
}