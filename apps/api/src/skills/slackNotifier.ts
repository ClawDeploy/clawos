import { Request, Response } from 'express'
import { z } from 'zod'

const slackSchema = z.object({
  webhookUrl: z.string().url().refine(
    url => url.includes('hooks.slack.com'),
    { message: 'Must be a valid Slack webhook URL' }
  ),
  message: z.string().min(1).max(4000).optional(),
  blocks: z.array(z.any()).optional(),
  attachments: z.array(z.any()).optional(),
  threadTs: z.string().optional(), // For replying in thread
  username: z.string().max(21).optional(), // Custom bot name
  iconEmoji: z.string().optional(),
  iconUrl: z.string().url().optional(),
  unfurlLinks: z.boolean().optional(),
  unfurlMedia: z.boolean().optional()
})

export async function sendSlackNotification(req: Request, res: Response) {
  try {
    const result = slackSchema.safeParse(req.body)
    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid input',
        details: result.error.issues
      })
    }

    const { 
      webhookUrl, 
      message, 
      blocks, 
      attachments, 
      threadTs,
      username,
      iconEmoji,
      iconUrl,
      unfurlLinks,
      unfurlMedia
    } = result.data

    // Validate that at least one content type is provided
    if (!message && !blocks && !attachments) {
      return res.status(400).json({
        success: false,
        error: 'Must provide at least one of: message, blocks, or attachments'
      })
    }

    // Build the payload
    const payload: any = {}
    
    if (message) payload.text = message
    if (blocks) payload.blocks = blocks
    if (attachments) payload.attachments = attachments
    if (threadTs) payload.thread_ts = threadTs
    if (username) payload.username = username
    if (iconEmoji) payload.icon_emoji = iconEmoji
    if (iconUrl) payload.icon_url = iconUrl
    if (typeof unfurlLinks === 'boolean') payload.unfurl_links = unfurlLinks
    if (typeof unfurlMedia === 'boolean') payload.unfurl_media = unfurlMedia

    // Send to Slack
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    })

    const responseText = await response.text()
    
    // Slack webhooks return "ok" on success
    if (response.status === 200 && responseText === 'ok') {
      res.json({
        success: true,
        message: 'Notification sent successfully',
        messageId: `slack_${Date.now()}`,
        threadTs: threadTs || null
      })
    } else {
      res.status(400).json({
        success: false,
        error: `Slack API error: ${responseText}`,
        status: response.status
      })
    }
  } catch (error) {
    console.error('Slack notifier error:', error)
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send notification'
    })
  }
}

// Pre-defined block templates for common use cases
export const slackBlockTemplates = {
  // Success notification
  success: (title: string, message: string) => [
    {
      type: 'header',
      text: {
        type: 'plain_text',
        text: `✅ ${title}`,
        emoji: true
      }
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: message
      }
    }
  ],
  
  // Error notification
  error: (title: string, message: string) => [
    {
      type: 'header',
      text: {
        type: 'plain_text',
        text: `❌ ${title}`,
        emoji: true
      }
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: message
      }
    }
  ],
  
  // Info notification
  info: (title: string, fields: { title: string; value: string; short?: boolean }[]) => [
    {
      type: 'header',
      text: {
        type: 'plain_text',
        text: `ℹ️ ${title}`,
        emoji: true
      }
    },
    {
      type: 'section',
      fields: fields.map(f => ({
        type: 'mrkdwn',
        text: `*${f.title}*\n${f.value}`
      }))
    }
  ],
  
  // Alert notification
  alert: (title: string, description: string, priority: 'low' | 'medium' | 'high') => {
    const colors = { low: '#36a64f', medium: '#daa520', high: '#ff0000' }
    return [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: `🚨 ${title}`,
          emoji: true
        }
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: description
        }
      },
      {
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: `Priority: *${priority.toUpperCase()}*`
          }
        ]
      }
    ]
  }
}

// Helper endpoint to get block templates
export function getSlackTemplates(req: Request, res: Response) {
  res.json({
    success: true,
    templates: {
      success: 'Use with: { title: string, message: string }',
      error: 'Use with: { title: string, message: string }',
      info: 'Use with: { title: string, fields: array }',
      alert: 'Use with: { title: string, description: string, priority: string }'
    }
  })
}
