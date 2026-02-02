import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '@clawos/database'
import { ethers } from 'ethers'
import { authenticateAgent } from '../middleware/auth'

const router: Router = Router()

// Validation schemas
const initiatePurchaseSchema = z.object({
  skillId: z.string().uuid(),
  currency: z.string().default('USDC'),
  chainId: z.number().optional().default(8453),
})

const confirmPurchaseSchema = z.object({
  purchaseId: z.string().uuid(),
  txHash: z.string().regex(/^0x[a-fA-F0-9]{64}$/, 'Invalid transaction hash'),
  chainId: z.number().optional().default(8453),
})

const withdrawSchema = z.object({
  amount: z.number().positive().optional(),
  toAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/).optional(),
  chainId: z.number().optional().default(8453),
})

// Contract addresses (should be loaded from environment)
const CONTRACT_ADDRESSES = {
  8453: { // Base Mainnet
    skillRegistry: process.env.BASE_SKILL_REGISTRY || '',
    paymentEscrow: process.env.BASE_PAYMENT_ESCROW || '',
    marketplace: process.env.BASE_MARKETPLACE || '',
    usdc: process.env.BASE_USDC || '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
  },
  84532: { // Base Sepolia
    skillRegistry: process.env.BASE_SEPOLIA_SKILL_REGISTRY || '',
    paymentEscrow: process.env.BASE_SEPOLIA_PAYMENT_ESCROW || '',
    marketplace: process.env.BASE_SEPOLIA_MARKETPLACE || '',
    usdc: process.env.BASE_SEPOLIA_USDC || '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
  },
}

// USDC ABI
const USDC_ABI = [
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function allowance(address owner, address spender) external view returns (uint256)",
  "function balanceOf(address account) external view returns (uint256)",
  "function decimals() external view returns (uint8)",
]

// Payment Escrow ABI (minimal)
const PAYMENT_ESCROW_ABI = [
  "function getBalance(address seller) external view returns (uint256)",
  "function withdrawFunds() external",
  "function getPayment(bytes32 paymentId) external view returns (tuple(bytes32 paymentId, bytes32 skillId, address buyer, address seller, uint256 amount, uint256 platformFee, uint8 status, uint256 createdAt, uint256 completedAt))",
]

// Helper to get provider for chain
function getProvider(chainId: number): ethers.JsonRpcProvider | null {
  const rpcUrls: Record<number, string> = {
    8453: process.env.BASE_MAINNET_RPC || 'https://mainnet.base.org',
    84532: process.env.BASE_SEPOLIA_RPC || 'https://sepolia.base.org',
  }
  
  const rpcUrl = rpcUrls[chainId]
  if (!rpcUrl) return null
  
  return new ethers.JsonRpcProvider(rpcUrl)
}

// POST /api/v1/purchase/initiate - Create purchase with escrow
router.post('/initiate', authenticateAgent, async (req, res) => {
  try {
    const result = initiatePurchaseSchema.safeParse(req.body)
    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid input',
        details: result.error.issues,
      })
    }

    const { skillId, currency, chainId } = result.data
    const buyerId = req.agent!.id

    // Get skill and seller info
    const skill = await prisma.skill.findUnique({
      where: { id: skillId },
      include: { agent: true },
    })

    if (!skill) {
      return res.status(404).json({
        success: false,
        error: 'Skill not found',
      })
    }

    if (!skill.agent.walletAddress) {
      return res.status(400).json({
        success: false,
        error: 'Seller has not connected a wallet',
      })
    }

    if (!skill.isPublished) {
      return res.status(400).json({
        success: false,
        error: 'Skill is not available for purchase',
      })
    }

    // Check if buyer has connected wallet
    const buyer = await prisma.agent.findUnique({
      where: { id: buyerId },
    })

    if (!buyer?.walletAddress) {
      return res.status(400).json({
        success: false,
        error: 'Please connect your wallet first',
      })
    }

    // Calculate amounts
    const amount = skill.price
    const platformFee = amount.mul(250).div(10000) // 2.5%
    const sellerAmount = amount.sub(platformFee)

    // Create purchase record
    const purchase = await prisma.purchase.create({
      data: {
        buyerId,
        skillId,
        licenseType: 'PERSONAL', // Default
        amount,
        currency,
        chainId,
        status: 'ACTIVE',
      },
    })

    // Create transaction record
    const transaction = await prisma.transaction.create({
      data: {
        buyerId,
        sellerId: skill.agentId,
        skillId,
        amount,
        currency,
        platformFee,
        chainId,
        status: 'PENDING',
      },
    })

    // Get contract addresses
    const addresses = CONTRACT_ADDRESSES[chainId]

    res.json({
      success: true,
      purchase: {
        id: purchase.id,
        skillId: purchase.skillId,
        amount: purchase.amount.toString(),
        currency: purchase.currency,
        chainId: purchase.chainId,
      },
      transaction: {
        id: transaction.id,
        amount: transaction.amount.toString(),
        platformFee: transaction.platformFee.toString(),
        sellerReceives: sellerAmount.toString(),
      },
      paymentInstructions: {
        contract: addresses.marketplace,
        escrow: addresses.paymentEscrow,
        usdc: addresses.usdc,
        sellerAddress: skill.agent.walletAddress,
        // These would be used by the frontend to create the actual blockchain transaction
        approveAmount: amount.toString(),
        skillPrice: skill.price.toString(),
      },
      message: 'Please approve USDC spend and call purchaseSkill on the marketplace contract',
    })
  } catch (error) {
    console.error('Initiate purchase error:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to initiate purchase',
    })
  }
})

// POST /api/v1/purchase/confirm - Confirm payment received
router.post('/confirm', authenticateAgent, async (req, res) => {
  try {
    const result = confirmPurchaseSchema.safeParse(req.body)
    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid input',
        details: result.error.issues,
      })
    }

    const { purchaseId, txHash, chainId } = result.data
    const buyerId = req.agent!.id

    // Get the purchase
    const purchase = await prisma.purchase.findFirst({
      where: {
        id: purchaseId,
        buyerId,
      },
      include: {
        skill: {
          include: { agent: true },
        },
      },
    })

    if (!purchase) {
      return res.status(404).json({
        success: false,
        error: 'Purchase not found',
      })
    }

    // Verify the transaction on-chain
    const provider = getProvider(chainId)
    if (!provider) {
      return res.status(500).json({
        success: false,
        error: 'Unsupported chain',
      })
    }

    try {
      const receipt = await provider.getTransactionReceipt(txHash)
      
      if (!receipt) {
        return res.status(404).json({
          success: false,
          error: 'Transaction not found on-chain',
        })
      }

      if (receipt.status !== 1) {
        return res.status(400).json({
          success: false,
          error: 'Transaction failed on-chain',
        })
      }
    } catch (err) {
      console.error('Transaction verification error:', err)
      // Continue anyway, the tx might still be pending
    }

    // Update purchase with transaction hash
    const updatedPurchase = await prisma.purchase.update({
      where: { id: purchaseId },
      data: {
        txHash,
        chainId,
      },
    })

    // Update transaction
    const transaction = await prisma.transaction.updateMany({
      where: {
        buyerId,
        skillId: purchase.skillId,
        status: 'PENDING',
      },
      data: {
        txHash,
        status: 'COMPLETED',
        completedAt: new Date(),
      },
    })

    // Create sale record for the seller
    const platformFee = purchase.amount.mul(250).div(10000)
    const netAmount = purchase.amount.sub(platformFee)

    await prisma.sale.create({
      data: {
        agentId: purchase.skill.agentId,
        skillId: purchase.skillId,
        buyerId,
        amount: purchase.amount,
        currency: purchase.currency,
        platformFee,
        netAmount,
        chainId,
        txHash,
        status: 'COMPLETED',
      },
    })

    // Update seller's stats
    await prisma.agent.update({
      where: { id: purchase.skill.agentId },
      data: {
        totalSales: { increment: 1 },
        balance: { increment: netAmount },
        totalEarned: { increment: netAmount },
      },
    })

    // Update buyer's stats
    await prisma.agent.update({
      where: { id: buyerId },
      data: {
        totalPurchases: { increment: 1 },
      },
    })

    res.json({
      success: true,
      message: 'Payment confirmed successfully',
      purchase: updatedPurchase,
    })
  } catch (error) {
    console.error('Confirm purchase error:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to confirm purchase',
    })
  }
})

// GET /api/v1/purchase/balance/:agentId - Get agent balance/earnings
router.get('/balance/:agentId', async (req, res) => {
  try {
    const { agentId } = req.params

    const agent = await prisma.agent.findUnique({
      where: { id: agentId },
      select: {
        id: true,
        name: true,
        walletAddress: true,
        walletChainId: true,
        balance: true,
        totalEarned: true,
      },
    })

    if (!agent) {
      return res.status(404).json({
        success: false,
        error: 'Agent not found',
      })
    }

    // Get on-chain escrow balance if available
    let escrowBalance = null
    const provider = getProvider(agent.walletChainId || 8453)
    if (provider && agent.walletAddress) {
      try {
        const addresses = CONTRACT_ADDRESSES[agent.walletChainId || 8453]
        if (addresses?.paymentEscrow) {
          const escrowContract = new ethers.Contract(
            addresses.paymentEscrow,
            PAYMENT_ESCROW_ABI,
            provider
          )
          const balance = await escrowContract.getBalance(agent.walletAddress)
          const usdcContract = new ethers.Contract(addresses.usdc, USDC_ABI, provider)
          const decimals = await usdcContract.decimals()
          escrowBalance = ethers.formatUnits(balance, decimals)
        }
      } catch (err) {
        console.error('Failed to fetch escrow balance:', err)
      }
    }

    // Get recent sales
    const recentSales = await prisma.sale.findMany({
      where: { agentId },
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: {
        skill: {
          select: { name: true },
        },
      },
    })

    // Get pending withdrawals (sales not yet withdrawn)
    const pendingWithdrawals = await prisma.sale.aggregate({
      where: {
        agentId,
        withdrawn: false,
      },
      _sum: {
        netAmount: true,
      },
    })

    res.json({
      success: true,
      balance: {
        platform: agent.balance.toString(),
        totalEarned: agent.totalEarned.toString(),
        escrow: escrowBalance,
        pendingWithdrawal: pendingWithdrawals._sum.netAmount?.toString() || '0',
      },
      recentSales: recentSales.map(sale => ({
        id: sale.id,
        skillName: sale.skill.name,
        amount: sale.amount.toString(),
        netAmount: sale.netAmount.toString(),
        createdAt: sale.createdAt,
        withdrawn: sale.withdrawn,
      })),
    })
  } catch (error) {
    console.error('Get balance error:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch balance',
    })
  }
})

// POST /api/v1/purchase/withdraw - Withdraw earnings to wallet
router.post('/withdraw', authenticateAgent, async (req, res) => {
  try {
    const result = withdrawSchema.safeParse(req.body)
    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid input',
        details: result.error.issues,
      })
    }

    const { amount, toAddress, chainId } = result.data
    const agentId = req.agent!.id

    // Get agent info
    const agent = await prisma.agent.findUnique({
      where: { id: agentId },
    })

    if (!agent?.walletAddress) {
      return res.status(400).json({
        success: false,
        error: 'No wallet connected',
      })
    }

    // Get pending sales
    const pendingSales = await prisma.sale.findMany({
      where: {
        agentId,
        withdrawn: false,
      },
    })

    if (pendingSales.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No funds available for withdrawal',
      })
    }

    const totalPending = pendingSales.reduce(
      (sum, sale) => sum.add(sale.netAmount),
      0
    )

    const withdrawAmount = amount ? totalPending.min(amount).max(0) : totalPending

    if (withdrawAmount.lte(0)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid withdrawal amount',
      })
    }

    // Get contract addresses
    const addresses = CONTRACT_ADDRESSES[chainId]

    res.json({
      success: true,
      message: 'Call withdrawFunds() on the PaymentEscrow contract to withdraw your earnings',
      withdrawal: {
        amount: withdrawAmount.toString(),
        toAddress: toAddress || agent.walletAddress,
        chainId,
        pendingSales: pendingSales.length,
      },
      instructions: {
        contract: addresses.paymentEscrow,
        method: 'withdrawFunds()',
        params: [],
      },
    })

    // Note: The actual on-chain withdrawal is done by the user calling the contract
    // We would listen for the Withdrawal event to update the database
  } catch (error) {
    console.error('Withdraw error:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to process withdrawal',
    })
  }
})

// GET /api/v1/purchase/history - Get purchase history
router.get('/history', authenticateAgent, async (req, res) => {
  try {
    const page = Number(req.query.page) || 1
    const limit = Number(req.query.limit) || 20
    const type = req.query.type as 'purchases' | 'sales' | undefined

    const agentId = req.agent!.id

    let purchases: any[] = []
    let sales: any[] = []

    if (!type || type === 'purchases') {
      purchases = await prisma.purchase.findMany({
        where: { buyerId: agentId },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          skill: {
            select: {
              name: true,
              description: true,
              category: true,
            },
          },
        },
      })
    }

    if (!type || type === 'sales') {
      sales = await prisma.sale.findMany({
        where: { agentId },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          skill: {
            select: {
              name: true,
            },
          },
        },
      })
    }

    const totalPurchases = await prisma.purchase.count({
      where: { buyerId: agentId },
    })

    const totalSales = await prisma.sale.count({
      where: { agentId },
    })

    res.json({
      success: true,
      purchases,
      sales,
      pagination: {
        page,
        limit,
        totalPurchases,
        totalSales,
      },
    })
  } catch (error) {
    console.error('Get history error:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch history',
    })
  }
})

export default router
