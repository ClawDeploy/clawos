// Database service for ClawOS
// In production, this would use Prisma Client

const { PrismaClient } = require('@prisma/client');

// Mock database for development
const mockDb = {
  agents: [],
  skills: [],
  purchases: [],
  transactions: [],
  earnings: [],
  sales: [],
  walletNonces: []
};

class DatabaseService {
  constructor() {
    this.prisma = null;
    this.useMock = true;
    
    // Try to initialize Prisma if available
    try {
      this.prisma = new PrismaClient();
      this.useMock = false;
    } catch (error) {
      console.log('[DB] Using mock database (Prisma not available)');
    }
  }

  // Agent operations
  async createAgent(data) {
    if (this.useMock) {
      const agent = {
        id: 'agent_' + Date.now(),
        ...data,
        walletVerified: false,
        totalEarnings: 0,
        pendingEarnings: 0,
        withdrawnEarnings: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      mockDb.agents.push(agent);
      return agent;
    }
    return this.prisma.agent.create({ data });
  }

  async getAgentById(id) {
    if (this.useMock) {
      return mockDb.agents.find(a => a.id === id) || null;
    }
    return this.prisma.agent.findUnique({ where: { id } });
  }

  async getAgentByWallet(walletAddress) {
    if (this.useMock) {
      return mockDb.agents.find(a => 
        a.ownerWallet === walletAddress || a.walletAddress === walletAddress
      ) || null;
    }
    return this.prisma.agent.findFirst({
      where: {
        OR: [
          { ownerWallet: walletAddress },
          { walletAddress: walletAddress }
        ]
      }
    });
  }

  async updateAgentWallet(agentId, walletData) {
    if (this.useMock) {
      const agent = mockDb.agents.find(a => a.id === agentId);
      if (agent) {
        Object.assign(agent, walletData, { updatedAt: new Date() });
        return agent;
      }
      return null;
    }
    return this.prisma.agent.update({
      where: { id: agentId },
      data: walletData
    });
  }

  async updateAgentEarnings(agentId, earningsData) {
    if (this.useMock) {
      const agent = mockDb.agents.find(a => a.id === agentId);
      if (agent) {
        if (earningsData.totalEarnings !== undefined) {
          agent.totalEarnings = earningsData.totalEarnings;
        }
        if (earningsData.pendingEarnings !== undefined) {
          agent.pendingEarnings = earningsData.pendingEarnings;
        }
        if (earningsData.withdrawnEarnings !== undefined) {
          agent.withdrawnEarnings = earningsData.withdrawnEarnings;
        }
        agent.updatedAt = new Date();
        return agent;
      }
      return null;
    }
    return this.prisma.agent.update({
      where: { id: agentId },
      data: earningsData
    });
  }

  // Skill operations
  async createSkill(data) {
    if (this.useMock) {
      const skill = {
        id: 'skill_' + Date.now(),
        ...data,
        isListedOnChain: false,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      mockDb.skills.push(skill);
      return skill;
    }
    return this.prisma.skill.create({ data });
  }

  async getSkillById(id) {
    if (this.useMock) {
      return mockDb.skills.find(s => s.id === id) || null;
    }
    return this.prisma.skill.findUnique({ where: { id } });
  }

  async updateSkillListing(skillId, listingData) {
    if (this.useMock) {
      const skill = mockDb.skills.find(s => s.id === skillId);
      if (skill) {
        Object.assign(skill, listingData, { updatedAt: new Date() });
        return skill;
      }
      return null;
    }
    return this.prisma.skill.update({
      where: { id: skillId },
      data: listingData
    });
  }

  async getSkillsByAgent(agentId) {
    if (this.useMock) {
      return mockDb.skills.filter(s => s.agentId === agentId);
    }
    return this.prisma.skill.findMany({ where: { agentId } });
  }

  // Purchase operations
  async createPurchase(data) {
    if (this.useMock) {
      const purchase = {
        id: 'purchase_' + Date.now(),
        ...data,
        status: data.status || 'PENDING',
        currentUsage: 0,
        createdAt: new Date()
      };
      mockDb.purchases.push(purchase);
      return purchase;
    }
    return this.prisma.purchase.create({ data });
  }

  async getPurchaseById(id) {
    if (this.useMock) {
      return mockDb.purchases.find(p => p.id === id) || null;
    }
    return this.prisma.purchase.findUnique({ where: { id } });
  }

  async getPurchaseByTxHash(txHash) {
    if (this.useMock) {
      return mockDb.purchases.find(p => p.txHash === txHash) || null;
    }
    return this.prisma.purchase.findUnique({ where: { txHash } });
  }

  async updatePurchaseStatus(purchaseId, status, additionalData = {}) {
    if (this.useMock) {
      const purchase = mockDb.purchases.find(p => p.id === purchaseId);
      if (purchase) {
        purchase.status = status;
        Object.assign(purchase, additionalData);
        return purchase;
      }
      return null;
    }
    return this.prisma.purchase.update({
      where: { id: purchaseId },
      data: { status, ...additionalData }
    });
  }

  async getPurchasesByBuyer(buyerId) {
    if (this.useMock) {
      return mockDb.purchases.filter(p => p.buyerId === buyerId);
    }
    return this.prisma.purchase.findMany({ where: { buyerId } });
  }

  // Transaction operations
  async createTransaction(data) {
    if (this.useMock) {
      const transaction = {
        id: 'tx_' + Date.now(),
        ...data,
        status: data.status || 'PENDING',
        createdAt: new Date(),
        updatedAt: new Date()
      };
      mockDb.transactions.push(transaction);
      return transaction;
    }
    return this.prisma.transaction.create({ data });
  }

  async getTransactionById(id) {
    if (this.useMock) {
      return mockDb.transactions.find(t => t.id === id) || null;
    }
    return this.prisma.transaction.findUnique({ where: { id } });
  }

  async getTransactionByHash(txHash) {
    if (this.useMock) {
      return mockDb.transactions.find(t => t.txHash === txHash) || null;
    }
    return this.prisma.transaction.findUnique({ where: { txHash } });
  }

  async updateTransactionStatus(txId, status, additionalData = {}) {
    if (this.useMock) {
      const tx = mockDb.transactions.find(t => t.id === txId);
      if (tx) {
        tx.status = status;
        tx.updatedAt = new Date();
        Object.assign(tx, additionalData);
        return tx;
      }
      return null;
    }
    return this.prisma.transaction.update({
      where: { id: txId },
      data: { status, updatedAt: new Date(), ...additionalData }
    });
  }

  async getTransactionsByAgent(agentId) {
    if (this.useMock) {
      return mockDb.transactions.filter(t => 
        t.fromAgentId === agentId || t.toAgentId === agentId
      );
    }
    return this.prisma.transaction.findMany({
      where: {
        OR: [
          { fromAgentId: agentId },
          { toAgentId: agentId }
        ]
      }
    });
  }

  // Earnings operations
  async createEarning(data) {
    if (this.useMock) {
      const earning = {
        id: 'earning_' + Date.now(),
        ...data,
        status: 'PENDING',
        createdAt: new Date()
      };
      mockDb.earnings.push(earning);
      return earning;
    }
    return this.prisma.earning.create({ data });
  }

  async getEarningsByAgent(agentId) {
    if (this.useMock) {
      return mockDb.earnings.filter(e => e.agentId === agentId);
    }
    return this.prisma.earning.findMany({ where: { agentId } });
  }

  async updateEarningStatus(earningId, status, additionalData = {}) {
    if (this.useMock) {
      const earning = mockDb.earnings.find(e => e.id === earningId);
      if (earning) {
        earning.status = status;
        Object.assign(earning, additionalData);
        return earning;
      }
      return null;
    }
    return this.prisma.earning.update({
      where: { id: earningId },
      data: { status, ...additionalData }
    });
  }

  // Sales operations
  async createSale(data) {
    if (this.useMock) {
      const sale = {
        id: 'sale_' + Date.now(),
        ...data,
        createdAt: new Date()
      };
      mockDb.sales.push(sale);
      return sale;
    }
    return this.prisma.sale.create({ data });
  }

  async getSalesBySeller(sellerId) {
    if (this.useMock) {
      return mockDb.sales.filter(s => s.sellerId === sellerId);
    }
    return this.prisma.sale.findMany({ where: { sellerId } });
  }

  // Wallet nonce operations
  async createWalletNonce(data) {
    if (this.useMock) {
      // Remove existing nonce for this wallet
      mockDb.walletNonces = mockDb.walletNonces.filter(n => n.walletAddress !== data.walletAddress);
      
      const nonce = {
        id: 'nonce_' + Date.now(),
        ...data,
        createdAt: new Date()
      };
      mockDb.walletNonces.push(nonce);
      return nonce;
    }
    
    // Delete existing nonce first
    await this.prisma.walletNonce.deleteMany({
      where: { walletAddress: data.walletAddress }
    });
    
    return this.prisma.walletNonce.create({ data });
  }

  async getWalletNonce(walletAddress) {
    if (this.useMock) {
      const nonce = mockDb.walletNonces.find(n => n.walletAddress === walletAddress);
      if (nonce && new Date() > new Date(nonce.expiresAt)) {
        // Remove expired nonce
        mockDb.walletNonces = mockDb.walletNonces.filter(n => n.id !== nonce.id);
        return null;
      }
      return nonce || null;
    }
    return this.prisma.walletNonce.findUnique({ where: { walletAddress } });
  }

  async deleteWalletNonce(walletAddress) {
    if (this.useMock) {
      mockDb.walletNonces = mockDb.walletNonces.filter(n => n.walletAddress !== walletAddress);
      return { count: 1 };
    }
    return this.prisma.walletNonce.deleteMany({ where: { walletAddress } });
  }

  // Stats operations
  async getAgentStats(agentId) {
    const agent = await this.getAgentById(agentId);
    if (!agent) return null;

    const skills = await this.getSkillsByAgent(agentId);
    const purchases = await this.getPurchasesByBuyer(agentId);
    const earnings = await this.getEarningsByAgent(agentId);
    const sales = await this.getSalesBySeller(agentId);

    return {
      agent: {
        id: agent.id,
        name: agent.name,
        walletAddress: agent.walletAddress,
        ownerWallet: agent.ownerWallet
      },
      balance: {
        totalEarnings: agent.totalEarnings || 0,
        pendingEarnings: agent.pendingEarnings || 0,
        withdrawnEarnings: agent.withdrawnEarnings || 0
      },
      skills: {
        total: skills.length,
        listed: skills.filter(s => s.isListedOnChain).length,
        published: skills.filter(s => s.isPublished).length
      },
      purchases: {
        total: purchases.length,
        active: purchases.filter(p => p.status === 'ACTIVE').length
      },
      earnings: {
        total: earnings.length,
        pending: earnings.filter(e => e.status === 'PENDING').length,
        available: earnings.filter(e => e.status === 'AVAILABLE').length,
        withdrawn: earnings.filter(e => e.status === 'WITHDRAWN').length
      },
      sales: {
        total: sales.length
      }
    };
  }
}

module.exports = DatabaseService;
