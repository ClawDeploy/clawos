import { Request, Response } from 'express'
import { z } from 'zod'
import * as cheerio from 'cheerio'

// Rate limiting store
const rateLimitStore = new Map<string, { count: number; resetTime: number }>()
const RATE_LIMIT = 10 // requests per minute
const RATE_WINDOW = 60000 // 1 minute in ms

const scraperSchema = z.object({
  url: z.string().url(),
  selector: z.string().default('body'),
  extractType: z.enum(['text', 'html', 'attribute', 'links', 'images']).default('text'),
  attribute: z.string().optional(), // for extractType: 'attribute'
  headers: z.record(z.string()).optional()
})

export async function scrapeWeb(req: Request, res: Response) {
  try {
    const result = scraperSchema.safeParse(req.body)
    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid input',
        details: result.error.issues
      })
    }

    const { url, selector, extractType, attribute, headers = {} } = result.data

    // Rate limiting check
    const clientId = req.ip || req.headers['x-forwarded-for']?.toString() || 'unknown'
    if (!checkRateLimit(clientId)) {
      return res.status(429).json({
        success: false,
        error: 'Rate limit exceeded. Maximum 10 requests per minute.'
      })
    }

    // Anti-detection headers
    const defaultHeaders: Record<string, string> = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br',
      'DNT': '1',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
      'Cache-Control': 'max-age=0',
      ...headers
    }

    // Fetch the webpage
    const response = await fetch(url, {
      headers: defaultHeaders,
      redirect: 'follow'
    })

    if (!response.ok) {
      return res.status(response.status).json({
        success: false,
        error: `Failed to fetch URL: ${response.status} ${response.statusText}`
      })
    }

    const html = await response.text()
    const $ = cheerio.load(html)
    const title = $('title').text().trim() || $('h1').first().text().trim() || 'No title'

    // Extract data based on selector and type
    let extractedData: any[] = []

    switch (extractType) {
      case 'text':
        $(selector).each((_, elem) => {
          const text = $(elem).text().trim()
          if (text) extractedData.push(text)
        })
        break
      case 'html':
        $(selector).each((_, elem) => {
          extractedData.push($(elem).html() || '')
        })
        break
      case 'attribute':
        if (!attribute) {
          return res.status(400).json({
            success: false,
            error: 'Attribute name required when extractType is "attribute"'
          })
        }
        $(selector).each((_, elem) => {
          const attr = $(elem).attr(attribute)
          if (attr) extractedData.push(attr)
        })
        break
      case 'links':
        $('a').each((_, elem) => {
          const href = $(elem).attr('href')
          const text = $(elem).text().trim()
          if (href) {
            extractedData.push({
              url: href.startsWith('http') ? href : new URL(href, url).href,
              text: text || href
            })
          }
        })
        break
      case 'images':
        $('img').each((_, elem) => {
          const src = $(elem).attr('src')
          const alt = $(elem).attr('alt') || ''
          if (src) {
            extractedData.push({
              url: src.startsWith('http') ? src : new URL(src, url).href,
              alt
            })
          }
        })
        break
    }

    // Remove duplicates for array results
    if (extractType === 'links' || extractType === 'images') {
      const seen = new Set<string>()
      extractedData = extractedData.filter((item: any) => {
        const key = item.url
        if (seen.has(key)) return false
        seen.add(key)
        return true
      })
    } else {
      extractedData = [...new Set(extractedData)]
    }

    res.json({
      success: true,
      title,
      url,
      selector,
      extractType,
      data: extractedData,
      count: extractedData.length
    })
  } catch (error) {
    console.error('Web scraper error:', error)
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Scraping failed'
    })
  }
}

function checkRateLimit(clientId: string): boolean {
  const now = Date.now()
  const clientData = rateLimitStore.get(clientId)
  
  if (!clientData || now > clientData.resetTime) {
    rateLimitStore.set(clientId, {
      count: 1,
      resetTime: now + RATE_WINDOW
    })
    return true
  }
  
  if (clientData.count >= RATE_LIMIT) {
    return false
  }
  
  clientData.count++
  return true
}
