import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '@clawos/database'
import { ethers } from 'ethers'
import { authenticateAgent } from '../middleware/auth'

const router: Router = Router()

// Validation schemas
const connectWalletSchema = z.object({
  walletAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid Ethereum address'),
  chainId: z.number().optional().default(8453), // Default to Base mainnet
  signature: z.string().optional(), // For verification
  message: z.string().optional(), // Message that was signed
})

const initiatePurchaseSchema = z.object({
  skillId: z.string().uuid(),
  sellerId: z.string(),
  amount: z.number().positive(),
  currency: z.string().default('USDC'),
})

const confirmPurchaseSchema = z.object({
  purchaseId: z.string().uuid(),
  txHash: z.string().regex(/^0x[a-fA-F0-9]{64}$/, 'Invalid transaction hash'),
})

const withdrawSchema = z.object({
  amount: z.number().positive().optional(), // If not provided, withdraw all
  toAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/).optional(), // If not provided, use agent's wallet
})

// Contract ABIs (simplified - full ABIs would be imported from contracts package)
const PAYMENT_ESCROW_ABI = [
  "function createPayment(bytes32 skillId, address seller, uint256 amount) external returns (bytes32 paymentId)",
  "function completePayment(bytes32 paymentId) external",
  "function getPayment(bytes32 paymentId) external view returns (tuple(bytes32 paymentId, bytes32 skillId, address buyer, address seller, uint256 amount, uint256 platformFee, uint8 status, uint256 createdAt, uint256 completedAt))",
  "function getBalance(address seller) external view returns (uint256)",
  "function withdrawFunds() external",
  "event PaymentCreated(bytes32 indexed paymentId, bytes32 indexed skillId, address indexed buyer, address seller, uint256 amount, uint256 platformFee)",
]

const SKILL_REGISTRY_ABI = [
  "function registerSkill(string calldata name, string calldata description, string calldata metadataURI, uint256 price) external returns (bytes32 skillId)",
  "function getSkill(bytes32 skillId) external view returns (tuple(bytes32 id, address owner, string name, string description, string metadataURI, uint256 price, bool isActive, uint256 createdAt, uint256 updatedAt))",
  "function getSkillsByOwner(address owner) external view returns (bytes32[] memory)",
]

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

// POST /api/v1/wallet/connect - Connect wallet address to agent
router.post('/connect', authenticateAgent, async (req, res) => {
  try {
    const result = connectWalletSchema.safeParse(req.body)
    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid input',
        details: result.error.issues,
      })
    }

    const { walletAddress, chainId, signature, message } = result.data
    const agentId = req.agent!.id

    // Verify the signature if provided
    if (signature && message) {
      try {
        const recoveredAddress = ethers.verifyMessage(message, signature)
        if (recoveredAddress.toLowerCase() !== walletAddress.toLowerCase()) {
          return res.status(401).json({
            success: false,
            error: 'Invalid signature',
          })
        }
      } catch (err) {
        return res.status(400).json({
          success: false,
          error: 'Signature verification failed',
        })
      }
    }

    // Check if wallet is already connected to another agent
    const existingAgent = await prisma.agent.findUnique({
      where: { walletAddress },
    })

    if (existingAgent && existingAgent.id !== agentId) {
      return res.status(409).json({
        success: false,
        error: 'Wallet already connected to another agent',
      })
    }

    // Update agent with wallet address
    const updatedAgent = await prisma.agent.update({
      where: { id: agentId },
      data: {
        walletAddress,
        walletChainId: chainId,
      },
    })

    res.json({
      success: true,
      message: 'Wallet connected successfully',
      wallet: {
        address: updatedAgent.walletAddress,
        chainId: updatedAgent.walletChainId,
      },
    })
  } catch (error) {
    console.error('Wallet connect error:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to connect wallet',
    })
  }
})

// GET /api/v1/wallet/me - Get current agent's wallet info
router.get('/me', authenticateAgent, async (req, res) => {
  try {
    const agent = await prisma.agent.findUnique({
      where: { id: req.agent!.id },
      select: {
        walletAddress: true,
        walletChainId: true,
        balance: true,
        totalEarned: true,
      },
    })

    if (!agent?.walletAddress) {
      return res.status(404).json({
        success: false,
        error: 'No wallet connected',
      })
    }

    // Get on-chain balance if provider is available
    let onChainBalance = null
    const provider = getProvider(agent.walletChainId || 8453)
    if (provider && agent.walletAddress) {
      try {
        const addresses = CONTRACT_ADDRESSES[agent.walletChainId || 8453]
        if (addresses?.usdc) {
          const usdcContract = new ethers.Contract(addresses.usdc, USDC_ABI, provider)
          const balance = await usdcContract.balanceOf(agent.walletAddress)
          const decimals = await usdcContract.decimals()
          onChainBalance = ethers.formatUnits(balance, decimals)
        }
      } catch (err) {
        console.error('Failed to fetch on-chain balance:', err)
      }
    }

    res.json({
      success: true,
      wallet: {
        address: agent.walletAddress,
        chainId: agent.walletChainId,
        platformBalance: agent.balance,
        totalEarned: agent.totalEarned,
        onChainBalance,
      },
    })
  } catch (error) {
    console.error('Get wallet error:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch wallet info',
    })
  }
})

// DELETE /api/v1/wallet/disconnect - Disconnect wallet
router.delete('/disconnect', authenticateAgent, async (req, res) => {
  try {
    await prisma.agent.update({
      where: { id: req.agent!.id },
      data: {
        walletAddress: null,
        walletChainId: null,
      },
    })

    res.json({
      success: true,
      message: 'Wallet disconnected successfully',
    })
  } catch (error) {
    console.error('Wallet disconnect error:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to disconnect wallet',
    })
  }
})

// POST /api/v1/wallet/nonce - Get nonce for wallet signature
router.post('/nonce', authenticateAgent, async (req, res) => {
  try {
    const { walletAddress } = req.body
    
    if (!walletAddress || !ethers.isAddress(walletAddress)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid wallet address',
      })
    }

    // Generate a nonce
    const nonce = `ClawOS Wallet Verification\nAgent: ${req.agent!.name}\nWallet: ${walletAddress}\nTimestamp: ${Date.now()}\nNonce: ${crypto.randomUUID()}`

    res.json({
      success: true,
      nonce,
      message: `Sign this message to verify ownership of ${walletAddress}`,
    })
  } catch (error) {
    console.error('Nonce generation error:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to generate nonce',
    })
  }
})

export default router
