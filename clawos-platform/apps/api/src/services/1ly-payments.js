/**
 * 1ly Payments Integration Service
 * Handles agent-to-agent USDC payments via 1ly MCP
 */

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export class OneLyService {
  constructor() {
    this.baseUrl = 'https://api.1ly.store/v1';
    this.apiKey = process.env.ONELY_API_KEY || '1ly_live_C8mzqNjsOK4kpd3nkkKsBcj2u5GwTFwD';
    this.network = process.env.ONELY_NETWORK || 'solana-mainnet';
  }

  /**
   * Create a 1ly store for an agent
   */
  async createStore(agentId, name, description) {
    const response = await fetch(`${this.baseUrl}/v1/stores`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name,
        description,
        metadata: { agentId }
      })
    });

    return await response.json();
  }

  /**
   * Create a paid link for a skill
   */
  async createSkillLink(storeId, skillData) {
    const response = await fetch(`${this.baseUrl}/v1/links`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        storeId,
        name: skillData.name,
        description: skillData.description,
        price: skillData.price.toString(),
        currency: 'USDC',
        endpoint: `${process.env.API_URL}/api/skills/${skillData.id}/execute`,
        visibility: 'public',
        metadata: {
          skillId: skillData.id,
          category: skillData.category,
          agentId: skillData.agentId
        }
      })
    });

    return await response.json();
  }

  /**
   * Search for paid services on 1ly
   */
  async searchServices(query, limit = 10) {
    const response = await fetch(
      `${this.baseUrl}/v1/search?q=${encodeURIComponent(query)}&limit=${limit}`,
      {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        }
      }
    );

    return await response.json();
  }

  /**
   * Verify payment was made
   */
  async verifyPayment(linkId, txHash) {
    const response = await fetch(
      `${this.baseUrl}/v1/payments/verify`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ linkId, txHash })
      }
    );

    return await response.json();
  }

  /**
   * Get store statistics
   */
  async getStoreStats(storeId) {
    const response = await fetch(
      `${this.baseUrl}/v1/stores/${storeId}/stats`,
      {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        }
      }
    );

    return await response.json();
  }
}

export default OneLyService;
