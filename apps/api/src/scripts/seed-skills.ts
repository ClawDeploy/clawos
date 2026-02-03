import { prisma, SkillCategory, PricingType } from '../database'

const API_BASE_URL = process.env.API_URL || 'http://localhost:3001/api'

const realSkills = [
  {
    name: 'GPT-4 Text Analyzer',
    description: 'Advanced text analysis using GPT-4. Extracts sentiment, entities, and generates summaries from any text input. Falls back to local analysis when API is unavailable.',
    category: SkillCategory.ANALYSIS,
    tags: ['ai', 'nlp', 'sentiment', 'entities', 'openai', 'gpt-4'],
    repoUrl: 'https://github.com/clawos/skills',
    repoBranch: 'main',
    entryPoint: '/api/skills/execute/gpt4-analyzer',
    pricingType: PricingType.USAGE,
    price: 0.001, // $0.001 per call
    currency: 'USDC',
    unitName: 'call',
    isPublished: true,
    isVerified: true,
    endpoints: [
      {
        path: '/api/skills/execute/gpt4-analyzer',
        method: 'POST',
        description: 'Analyze text for sentiment, entities, and summary',
        requestSchema: JSON.stringify({
          type: 'object',
          properties: {
            text: { type: 'string', minLength: 1, maxLength: 50000 }
          },
          required: ['text']
        }),
        responseSchema: JSON.stringify({
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            source: { type: 'string', enum: ['openai', 'local', 'local-fallback'] },
            sentiment: { type: 'string', enum: ['positive', 'negative', 'neutral', 'mixed'] },
            entities: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  type: { type: 'string' },
                  relevance: { type: 'number' }
                }
              }
            },
            summary: { type: 'string' }
          }
        })
      }
    ]
  },
  {
    name: 'Data Transformer',
    description: 'Convert data between JSON, CSV, XML, and Parquet formats. Supports custom delimiters, headers, and XML root element configuration.',
    category: SkillCategory.UTILITY,
    tags: ['data', 'convert', 'csv', 'json', 'xml', 'transform'],
    repoUrl: 'https://github.com/clawos/skills',
    repoBranch: 'main',
    entryPoint: '/api/skills/execute/data-transformer',
    pricingType: PricingType.FREE,
    price: 0,
    currency: 'USDC',
    isPublished: true,
    isVerified: true,
    endpoints: [
      {
        path: '/api/skills/execute/data-transformer',
        method: 'POST',
        description: 'Transform data between formats (JSON, CSV, XML)',
        requestSchema: JSON.stringify({
          type: 'object',
          properties: {
            data: { type: 'any' },
            fromFormat: { type: 'string', enum: ['json', 'csv', 'xml', 'parquet'] },
            toFormat: { type: 'string', enum: ['json', 'csv', 'xml', 'parquet'] },
            options: {
              type: 'object',
              properties: {
                csvDelimiter: { type: 'string', default: ',' },
                csvHeader: { type: 'boolean', default: true },
                xmlRootName: { type: 'string', default: 'root' },
                xmlItemName: { type: 'string', default: 'item' }
              }
            }
          },
          required: ['data', 'fromFormat', 'toFormat']
        }),
        responseSchema: JSON.stringify({
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            fromFormat: { type: 'string' },
            toFormat: { type: 'string' },
            transformedData: { type: 'any' },
            recordCount: { type: 'number' }
          }
        })
      }
    ]
  },
  {
    name: 'Smart Web Scraper',
    description: 'Scrape web pages with anti-detection headers and rate limiting. Extract text, HTML, links, images, or custom selectors. Respects robots.txt with built-in rate limiting.',
    category: SkillCategory.AUTOMATION,
    tags: ['scraping', 'web', 'cheerio', 'data', 'automation'],
    repoUrl: 'https://github.com/clawos/skills',
    repoBranch: 'main',
    entryPoint: '/api/skills/execute/web-scraper',
    pricingType: PricingType.USAGE,
    price: 0.005, // $0.005 per call
    currency: 'USDC',
    unitName: 'call',
    isPublished: true,
    isVerified: true,
    endpoints: [
      {
        path: '/api/skills/execute/web-scraper',
        method: 'POST',
        description: 'Scrape web page content with rate limiting',
        requestSchema: JSON.stringify({
          type: 'object',
          properties: {
            url: { type: 'string', format: 'uri' },
            selector: { type: 'string', default: 'body' },
            extractType: { type: 'string', enum: ['text', 'html', 'attribute', 'links', 'images'], default: 'text' },
            attribute: { type: 'string' },
            headers: { type: 'object', additionalProperties: { type: 'string' } }
          },
          required: ['url']
        }),
        responseSchema: JSON.stringify({
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            title: { type: 'string' },
            url: { type: 'string' },
            selector: { type: 'string' },
            extractType: { type: 'string' },
            data: { type: 'array' },
            count: { type: 'number' }
          }
        })
      }
    ]
  },
  {
    name: 'Slack Notifier',
    description: 'Send notifications to Slack via webhooks. Supports blocks, attachments, threading, and custom bot appearance. Includes pre-built templates for common notification types.',
    category: SkillCategory.COMMUNICATION,
    tags: ['slack', 'notifications', 'webhook', 'messaging', 'alerts'],
    repoUrl: 'https://github.com/clawos/skills',
    repoBranch: 'main',
    entryPoint: '/api/skills/execute/slack-notify',
    pricingType: PricingType.FREE,
    price: 0,
    currency: 'USDC',
    isPublished: true,
    isVerified: true,
    endpoints: [
      {
        path: '/api/skills/execute/slack-notify',
        method: 'POST',
        description: 'Send Slack notification via webhook',
        requestSchema: JSON.stringify({
          type: 'object',
          properties: {
            webhookUrl: { type: 'string', format: 'uri' },
            message: { type: 'string', maxLength: 4000 },
            blocks: { type: 'array' },
            attachments: { type: 'array' },
            threadTs: { type: 'string' },
            username: { type: 'string', maxLength: 21 },
            iconEmoji: { type: 'string' },
            iconUrl: { type: 'string', format: 'uri' }
          },
          required: ['webhookUrl']
        }),
        responseSchema: JSON.stringify({
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            messageId: { type: 'string' },
            threadTs: { type: ['string', 'null'] }
          }
        })
      },
      {
        path: '/api/skills/execute/slack-notify/templates',
        method: 'GET',
        description: 'Get available Slack block templates',
        requestSchema: JSON.stringify({ type: 'object' }),
        responseSchema: JSON.stringify({
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            templates: { type: 'object' }
          }
        })
      }
    ]
  },
  {
    name: 'Transaction Analyzer',
    description: 'Analyze Solana, Ethereum, and BASE transactions for risk patterns. Detects DEX interactions, token transfers, contract deployments, and suspicious activity with risk scoring.',
    category: SkillCategory.ANALYSIS,
    tags: ['blockchain', 'solana', 'ethereum', 'base', 'risk', 'analysis', 'crypto'],
    repoUrl: 'https://github.com/clawos/skills',
    repoBranch: 'main',
    entryPoint: '/api/skills/execute/tx-analyzer',
    pricingType: PricingType.USAGE,
    price: 0.002, // $0.002 per call
    currency: 'USDC',
    unitName: 'call',
    isPublished: true,
    isVerified: true,
    endpoints: [
      {
        path: '/api/skills/execute/tx-analyzer',
        method: 'POST',
        description: 'Analyze blockchain transaction for risk patterns',
        requestSchema: JSON.stringify({
          type: 'object',
          properties: {
            txHash: { type: 'string', minLength: 10 },
            chain: { type: 'string', enum: ['solana', 'ethereum', 'base'], default: 'solana' }
          },
          required: ['txHash']
        }),
        responseSchema: JSON.stringify({
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            txHash: { type: 'string' },
            chain: { type: 'string' },
            riskScore: { type: 'number' },
            riskLevel: { type: 'string', enum: ['low', 'medium', 'high', 'critical'] },
            patterns: { type: 'array', items: { type: 'string' } },
            flags: { type: 'array', items: { type: 'string' } },
            details: { type: 'object' }
          }
        })
      }
    ]
  },
  {
    name: 'Time Series Forecaster',
    description: 'Forecast future values from time series data using linear regression, moving average, or exponential smoothing. Calculates confidence scores and trend analysis.',
    category: SkillCategory.ANALYSIS,
    tags: ['forecasting', 'prediction', 'time-series', 'analytics', 'data'],
    repoUrl: 'https://github.com/clawos/skills',
    repoBranch: 'main',
    entryPoint: '/api/skills/execute/forecaster',
    pricingType: PricingType.FREE,
    price: 0,
    currency: 'USDC',
    isPublished: true,
    isVerified: true,
    endpoints: [
      {
        path: '/api/skills/execute/forecaster',
        method: 'POST',
        description: 'Forecast time series data',
        requestSchema: JSON.stringify({
          type: 'object',
          properties: {
            data: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  timestamp: { type: 'string' },
                  value: { type: 'number' }
                },
                required: ['timestamp', 'value']
              },
              minItems: 3
            },
            periods: { type: 'number', minimum: 1, maximum: 100, default: 5 },
            method: { type: 'string', enum: ['linear', 'moving_average', 'exponential_smoothing'], default: 'linear' }
          },
          required: ['data']
        }),
        responseSchema: JSON.stringify({
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            method: { type: 'string' },
            periods: { type: 'number' },
            predictions: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  period: { type: 'number' },
                  timestamp: { type: 'string' },
                  value: { type: 'number' }
                }
              }
            },
            confidence: { type: 'number' },
            trend: { type: 'string', enum: ['up', 'down', 'stable'] },
            metrics: { type: 'object' },
            historicalStats: { type: 'object' }
          }
        })
      }
    ]
  }
]

async function seedRealSkills() {
  console.log('🌱 Seeding real skills into database...')

  // Find or create a system agent to own these skills
  let systemAgent = await prisma.agent.findFirst({
    where: { name: 'ClawOS System' }
  })

  if (!systemAgent) {
    systemAgent = await prisma.agent.create({
      data: {
        name: 'ClawOS System',
        description: 'Official ClawOS system agent for built-in skills',
        ownerWallet: 'system_clawos_' + Date.now(),
        isGuest: false,
        reputation: 5.0,
        totalSales: 9999
      }
    })
    console.log('✅ Created system agent:', systemAgent.id)
  }

  for (const skillData of realSkills) {
    const existingSkill = await prisma.skill.findFirst({
      where: { name: skillData.name }
    })

    if (existingSkill) {
      console.log(`⚡ Updating skill: ${skillData.name}`)
      
      // Delete old endpoints
      await prisma.endpoint.deleteMany({
        where: { skillId: existingSkill.id }
      })
      
      // Update skill and create new endpoints
      await prisma.skill.update({
        where: { id: existingSkill.id },
        data: {
          description: skillData.description,
          category: skillData.category,
          tags: skillData.tags,
          entryPoint: skillData.entryPoint,
          pricingType: skillData.pricingType,
          price: skillData.price,
          currency: skillData.currency,
          unitName: skillData.unitName,
          isPublished: skillData.isPublished,
          isVerified: skillData.isVerified,
          endpoints: {
            create: skillData.endpoints
          }
        }
      })
    } else {
      console.log(`🆕 Creating skill: ${skillData.name}`)
      
      await prisma.skill.create({
        data: {
          name: skillData.name,
          description: skillData.description,
          category: skillData.category,
          tags: skillData.tags,
          repoUrl: skillData.repoUrl,
          repoBranch: skillData.repoBranch,
          entryPoint: skillData.entryPoint,
          pricingType: skillData.pricingType,
          price: skillData.price,
          currency: skillData.currency,
          unitName: skillData.unitName,
          isPublished: skillData.isPublished,
          isVerified: skillData.isVerified,
          agentId: systemAgent.id,
          endpoints: {
            create: skillData.endpoints
          }
        }
      })
    }
  }

  console.log('✅ Skills seeded successfully!')
}

seedRealSkills()
  .catch((error) => {
    console.error('❌ Seed failed:', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
