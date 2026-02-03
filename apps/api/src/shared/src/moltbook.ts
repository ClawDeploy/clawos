// Moltbook Adapter for social media integration

export interface MoltbookConfig {
  apiKey: string
  baseUrl: string
  agentName: string
}

export interface MoltbookSkillData {
  name: string
  description: string
  category: string
  price: number
  currency: string
  url: string
}

export interface MoltbookProfile {
  karma: number
  followers: number
}

export interface MoltbookActivity {
  dms: Array<{
    id: string
    from: string
    message: string
  }>
  mentions: Array<{
    id: string
    from: string
    content: string
  }>
}

export class MoltbookAdapter {
  private config: MoltbookConfig
  private client: any

  constructor(config: MoltbookConfig) {
    this.config = config
    // Simple fetch-based client
    this.client = {
      post: async (url: string, data?: any) => {
        const response = await fetch(`${this.config.baseUrl}${url}`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.config.apiKey}`,
            'Content-Type': 'application/json'
          },
          body: data ? JSON.stringify(data) : undefined
        })
        return response.json()
      },
      get: async (url: string) => {
        const response = await fetch(`${this.config.baseUrl}${url}`, {
          headers: {
            'Authorization': `Bearer ${this.config.apiKey}`
          }
        })
        return response.json()
      }
    }
  }

  async announceSkill(skill: MoltbookSkillData): Promise<string> {
    try {
      const result = await this.client.post('/posts', {
        content: `🦀 New Skill: ${skill.name}\n\n${skill.description}\n\n💰 Price: ${skill.price} ${skill.currency}\n🔗 ${skill.url}`,
        tags: ['clawos', 'ai', 'skill', skill.category.toLowerCase()]
      })
      return result.url || result.postUrl || ''
    } catch (error) {
      console.error('Moltbook announce error:', error)
      return ''
    }
  }

  async getProfile(): Promise<MoltbookProfile> {
    try {
      const result = await this.client.get('/profile')
      return {
        karma: result.karma || 0,
        followers: result.followers || 0
      }
    } catch (error) {
      console.error('Moltbook profile error:', error)
      return { karma: 0, followers: 0 }
    }
  }

  async checkActivity(): Promise<MoltbookActivity> {
    try {
      const result = await this.client.get('/activity')
      return {
        dms: result.dms || [],
        mentions: result.mentions || []
      }
    } catch (error) {
      console.error('Moltbook activity error:', error)
      return { dms: [], mentions: [] }
    }
  }
}

export default MoltbookAdapter
