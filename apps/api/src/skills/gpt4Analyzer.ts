import { Request, Response } from 'express'
import OpenAI from 'openai'
import { z } from 'zod'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || 'sk-test-key'
})

const analyzerSchema = z.object({
  text: z.string().min(1).max(50000)
})

export async function analyzeText(req: Request, res: Response) {
  try {
    const result = analyzerSchema.safeParse(req.body)
    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid input',
        details: result.error.issues
      })
    }

    const { text } = result.data

    // Check if OpenAI API key is configured
    if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'sk-test-key') {
      // Fallback to local analysis if no API key
      const localResult = performLocalAnalysis(text)
      return res.json({
        success: true,
        source: 'local',
        ...localResult
      })
    }

    // Call OpenAI API for real analysis
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are a text analysis engine. Analyze the provided text and return a JSON object with:
          - sentiment: "positive", "negative", "neutral", or "mixed"
          - entities: array of objects with {name, type, relevance} where type can be "PERSON", "ORGANIZATION", "LOCATION", "PRODUCT", "EVENT", "DATE", "MONEY", "PERCENT", "OTHER"
          - summary: a concise 1-2 sentence summary
          
          Return ONLY valid JSON, no markdown formatting.`
        },
        {
          role: 'user',
          content: text
        }
      ],
      response_format: { type: 'json_object' },
      max_tokens: 1000
    })

    const analysisContent = completion.choices[0]?.message?.content || '{}'
    const analysis = JSON.parse(analysisContent)

    res.json({
      success: true,
      source: 'openai',
      sentiment: analysis.sentiment || 'neutral',
      entities: analysis.entities || [],
      summary: analysis.summary || text.substring(0, 200) + '...',
      usage: completion.usage
    })
  } catch (error) {
    console.error('GPT-4 Analyzer error:', error)
    // Fallback to local analysis on error
    const localResult = performLocalAnalysis(req.body.text || '')
    res.json({
      success: true,
      source: 'local-fallback',
      ...localResult
    })
  }
}

function performLocalAnalysis(text: string) {
  // Simple local sentiment analysis
  const positiveWords = ['good', 'great', 'excellent', 'amazing', 'love', 'best', 'happy', 'wonderful', 'fantastic', 'perfect', 'awesome', 'brilliant', 'outstanding', 'superb', 'positive', 'success', 'win', 'gain', 'profit', 'growth']
  const negativeWords = ['bad', 'terrible', 'awful', 'hate', 'worst', 'sad', 'horrible', 'disgusting', 'poor', 'negative', 'fail', 'loss', 'decline', 'problem', 'issue', 'concern', 'worry', 'disappointed', 'frustrated', 'angry']
  
  const lowerText = text.toLowerCase()
  let positiveCount = 0
  let negativeCount = 0
  
  positiveWords.forEach(word => {
    const matches = lowerText.match(new RegExp(`\\b${word}\\b`, 'g'))
    if (matches) positiveCount += matches.length
  })
  
  negativeWords.forEach(word => {
    const matches = lowerText.match(new RegExp(`\\b${word}\\b`, 'g'))
    if (matches) negativeCount += matches.length
  })
  
  let sentiment = 'neutral'
  if (positiveCount > negativeCount * 1.5) sentiment = 'positive'
  else if (negativeCount > positiveCount * 1.5) sentiment = 'negative'
  else if (positiveCount > 0 && negativeCount > 0) sentiment = 'mixed'
  
  // Simple entity extraction
  const entities: any[] = []
  
  // Capitalized words as potential entities
  const capitalizedWords = text.match(/\b[A-Z][a-z]+\s+[A-Z][a-z]+\b/g) || []
  const uniqueEntities = [...new Set(capitalizedWords)]
  
  uniqueEntities.slice(0, 10).forEach((entity, i) => {
    entities.push({
      name: entity,
      type: 'OTHER',
      relevance: Math.round((1 - i * 0.1) * 100) / 100
    })
  })
  
  // Generate summary
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 10)
  const summary = sentences.slice(0, 2).join('. ').trim() + (sentences.length > 2 ? '...' : '')
  
  return {
    sentiment,
    entities,
    summary: summary || text.substring(0, 200)
  }
}
