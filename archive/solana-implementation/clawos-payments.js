/**
 * ClawOS Payment SDK
 * JavaScript client for integrating with ClawOS payment system
 */

class ClawOSPayments {
  constructor(config) {
    this.baseUrl = config.baseUrl || 'http://localhost:3001';
    this.apiKey = config.apiKey;
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      ...(this.apiKey && { 'X-API-Key': this.apiKey }),
      ...options.headers
    };

    const response = await fetch(url, {
      ...options,
      headers
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Request failed');
    }

    return response.json();
  }

  // ==================== WALLET ====================

  /**
   * Get nonce for wallet verification
   * @param {string} walletAddress - Solana wallet address
   */
  async getWalletNonce(walletAddress) {
    return this.request('/api/wallet/nonce', {
      method: 'POST',
      body: JSON.stringify({ walletAddress })
    });
  }

  /**
   * Verify wallet signature
   * @param {string} walletAddress - Solana wallet address
   * @param {string} signature - Signed message signature
   * @param {string} agentId - Agent ID to link wallet to
   */
  async verifyWallet(walletAddress, signature, agentId) {
    return this.request('/api/wallet/verify', {
      method: 'POST',
      body: JSON.stringify({ walletAddress, signature, agentId })
    });
  }

  /**
   * Get wallet USDC balance
   * @param {string} walletAddress - Solana wallet address
   */
  async getWalletBalance(walletAddress) {
    return this.request(`/api/wallet/balance/${walletAddress}`);
  }

  // ==================== PURCHASES ====================

  /**
   * Purchase a skill
   * @param {string} buyerId - Buyer agent ID
   * @param {string} skillId - Skill ID to purchase
   * @param {string} txHash - Optional transaction hash
   */
  async purchaseSkill(buyerId, skillId, txHash = null) {
    return this.request('/api/payments/purchase', {
      method: 'POST',
      body: JSON.stringify({ buyerId, skillId, txHash })
    });
  }

  /**
   * Verify a transaction
   * @param {string} txHash - Transaction hash
   */
  async verifyTransaction(txHash) {
    return this.request(`/api/payments/verify/${txHash}`);
  }

  /**
   * Get payment history for an agent
   * @param {string} agentId - Agent ID
   */
  async getPaymentHistory(agentId) {
    return this.request(`/api/payments/history/${agentId}`);
  }

  // ==================== EARNINGS ====================

  /**
   * Get earnings for an agent
   * @param {string} agentId - Agent ID
   * @param {string} status - Filter by status (PENDING, AVAILABLE, WITHDRAWN)
   */
  async getEarnings(agentId, status = null) {
    const query = status ? `?status=${status}` : '';
    return this.request(`/api/earnings/${agentId}${query}`);
  }

  /**
   * Withdraw earnings
   * @param {string} agentId - Agent ID
   * @param {number} amount - Amount to withdraw
   */
  async withdrawEarnings(agentId, amount) {
    return this.request('/api/earnings/withdraw', {
      method: 'POST',
      body: JSON.stringify({ agentId, amount })
    });
  }

  /**
   * Claim payment for a skill sale
   * @param {string} agentId - Seller agent ID
   * @param {string} skillId - Skill ID
   * @param {string} txHash - Claim transaction hash
   */
  async claimPayment(agentId, skillId, txHash) {
    return this.request('/api/payments/claim', {
      method: 'POST',
      body: JSON.stringify({ agentId, skillId, txHash })
    });
  }

  // ==================== AGENTS ====================

  /**
   * Register a new agent
   * @param {Object} data - Agent data
   */
  async registerAgent(data) {
    return this.request('/api/agents/register', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  /**
   * Get agent details
   * @param {string} agentId - Agent ID
   */
  async getAgent(agentId) {
    return this.request(`/api/agents/${agentId}`);
  }

  /**
   * Get agent balance
   * @param {string} agentId - Agent ID
   */
  async getAgentBalance(agentId) {
    return this.request(`/api/agents/${agentId}/balance`);
  }

  /**
   * Get agent stats
   * @param {string} agentId - Agent ID
   */
  async getAgentStats(agentId) {
    return this.request(`/api/agents/${agentId}/stats`);
  }

  /**
   * Update agent wallet
   * @param {string} agentId - Agent ID
   * @param {string} walletAddress - New wallet address
   */
  async updateAgentWallet(agentId, walletAddress) {
    return this.request(`/api/agents/${agentId}/wallet`, {
      method: 'POST',
      body: JSON.stringify({ walletAddress })
    });
  }

  // ==================== SKILLS ====================

  /**
   * List a skill on the marketplace
   * @param {Object} data - Skill data
   */
  async createSkill(data) {
    return this.request('/api/skills', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  /**
   * List skill on blockchain
   * @param {string} skillId - Skill ID
   * @param {Object} listingData - Listing configuration
   */
  async listSkillOnChain(skillId, listingData) {
    return this.request(`/api/skills/${skillId}/list`, {
      method: 'POST',
      body: JSON.stringify(listingData)
    });
  }

  /**
   * Get marketplace skills
   */
  async getMarketplace() {
    return this.request('/api/marketplace');
  }
}

// ==================== USAGE EXAMPLE ====================

async function example() {
  const clawos = new ClawOSPayments({
    baseUrl: 'http://localhost:3001'
  });

  try {
    // 1. Register an agent
    console.log('Registering agent...');
    const seller = await clawos.registerAgent({
      name: 'AI Assistant Pro',
      description: 'Advanced AI assistant with payment integration',
      ownerWallet: '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU'
    });
    console.log('Seller registered:', seller.agent.id);

    const buyer = await clawos.registerAgent({
      name: 'AI User',
      description: 'Agent looking for skills',
      ownerWallet: '8yLYuh3DX98dU8YUjTEqcE6kClhfUrBVZuKptihtBfV'
    });
    console.log('Buyer registered:', buyer.agent.id);

    // 2. Create a skill
    console.log('\nCreating skill...');
    const skill = await clawos.createSkill({
      agentId: seller.agent.id,
      name: 'Email Automation',
      description: 'Automatically handle and respond to emails',
      category: 'AUTOMATION',
      pricingType: 'ONE_TIME',
      price: 10.00,
      currency: 'USDC',
      repoUrl: 'https://github.com/example/email-skill'
    });
    console.log('Skill created:', skill.skill.id);

    // 3. List skill on marketplace
    console.log('\nListing skill...');
    const listing = await clawos.listSkillOnChain(skill.skill.id, {
      price: 10.00,
      isSubscription: false
    });
    console.log('Skill listed:', listing.skill.skillListingPda);

    // 4. Get marketplace
    console.log('\nGetting marketplace...');
    const marketplace = await clawos.getMarketplace();
    console.log('Available skills:', marketplace.total);

    // 5. Purchase skill
    console.log('\nPurchasing skill...');
    const purchase = await clawos.purchaseSkill(
      buyer.agent.id,
      skill.skill.id
    );
    console.log('Purchase:', purchase.purchase);

    // 6. Check earnings
    console.log('\nChecking seller earnings...');
    const earnings = await clawos.getEarnings(seller.agent.id);
    console.log('Total earnings:', earnings.summary.totalEarnings);

    // 7. Check buyer payment history
    console.log('\nChecking buyer payment history...');
    const history = await clawos.getPaymentHistory(buyer.agent.id);
    console.log('Transactions:', history.transactions.length);

    console.log('\n✅ Example completed successfully!');

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Run example if executed directly
if (typeof window === 'undefined' && require.main === module) {
  example();
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ClawOSPayments;
}
