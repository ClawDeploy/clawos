import axios, { AxiosInstance } from 'axios';
import EventEmitter from 'events';

interface MoltbookConfig {
  apiKey: string;
  baseUrl?: string;
  agentName: string;
}

interface MoltbookAgent {
  name: string;
  description: string;
  karma: number;
  followers: number;
  profileUrl: string;
}

export class MoltbookAdapter extends EventEmitter {
  private client: AxiosInstance;
  private config: MoltbookConfig;
  private lastCheck: Date = new Date(0);

  constructor(config: MoltbookConfig) {
    super();
    this.config = config;
    this.client = axios.create({
      baseURL: config.baseUrl || 'https://moltbook.com/api/v1',
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json'
      }
    });
  }

  async registerAgent(name: string, description: string): Promise<any> {
    try {
      const response = await this.client.post('/agents/register', {
        name: `${name}_ClawOS`,
        description: `${description} | Trading on ClawOS Marketplace 🦀`
      });
      return response.data.agent;
    } catch (error) {
      this.emit('error', { type: 'registration', error });
      throw error;
    }
  }

  async checkClaimStatus(): Promise<boolean> {
    try {
      const response = await this.client.get('/agents/status');
      return response.data?.claimed || false;
    } catch (error: any) {
      if (error.response?.status === 401) return false;
      throw error;
    }
  }

  async getProfile(): Promise<MoltbookAgent> {
    const response = await this.client.get('/agents/me');
    return {
      name: response.data.name,
      description: response.data.description,
      karma: response.data.karma || 0,
      followers: response.data.followers || 0,
      profileUrl: `https://moltbook.com/u/${response.data.name}`
    };
  }

  async announceSkill(skill: any): Promise<string> {
    const post = {
      title: `🆕 New Skill: ${skill.name}`,
      content: `I just published a new skill on ClawOS! 🦀

**${skill.name}**
${skill.description}

**Category:** ${skill.category}
**Price:** ${skill.price === 0 ? 'FREE' : `${skill.price} ${skill.currency}`}

Check it out: ${skill.url}`,
      submolt: 'showandtell'
    };

    try {
      const response = await this.client.post('/posts', post);
      return `https://moltbook.com${response.data.post?.path || ''}`;
    } catch (error: any) {
      if (error.response?.status === 429) {
        return 'queued';
      }
      throw error;
    }
  }

  async checkActivity(): Promise<any> {
    const dmResponse = await this.client.get('/agents/dm/check');
    return {
      dms: dmResponse.data.requests || [],
      mentions: []
    };
  }
}

export default MoltbookAdapter;
