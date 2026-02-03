import { Request, Response } from 'express'
import { z } from 'zod'
import { Connection, PublicKey, ConfirmedSignatureInfo } from '@solana/web3.js'
import { ethers } from 'ethers'

// Solana connection
const solanaConnection = new Connection(
  process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com',
  'confirmed'
)

// Ethereum/BASE providers
const ethereumProvider = new ethers.JsonRpcProvider(
  process.env.ETHEREUM_RPC_URL || 'https://ethereum.publicnode.com'
)
const baseProvider = new ethers.JsonRpcProvider(
  process.env.BASE_MAINNET_RPC || 'https://mainnet.base.org'
)

const analyzerSchema = z.object({
  txHash: z.string().min(10),
  chain: z.enum(['solana', 'ethereum', 'base']).default('solana')
})

export async function analyzeTransaction(req: Request, res: Response) {
  try {
    const result = analyzerSchema.safeParse(req.body)
    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid input',
        details: result.error.issues
      })
    }

    const { txHash, chain } = result.data

    let analysis: {
      riskScore: number;
      patterns: string[];
      flags: string[];
      details: any;
    }

    switch (chain) {
      case 'solana':
        analysis = await analyzeSolanaTransaction(txHash)
        break
      case 'ethereum':
        analysis = await analyzeEthereumTransaction(txHash, ethereumProvider)
        break
      case 'base':
        analysis = await analyzeEthereumTransaction(txHash, baseProvider)
        break
      default:
        return res.status(400).json({
          success: false,
          error: `Unsupported chain: ${chain}`
        })
    }

    res.json({
      success: true,
      txHash,
      chain,
      ...analysis,
      riskLevel: getRiskLevel(analysis.riskScore)
    })
  } catch (error) {
    console.error('Transaction analyzer error:', error)
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Analysis failed'
    })
  }
}

async function analyzeSolanaTransaction(txHash: string): Promise<any> {
  try {
    const signature = txHash
    const tx = await solanaConnection.getParsedTransaction(signature, 'confirmed')
    
    if (!tx) {
      throw new Error('Transaction not found')
    }

    const patterns: string[] = []
    const flags: string[] = []
    let riskScore = 0

    const details: any = {
      slot: tx.slot,
      blockTime: tx.blockTime ? new Date(tx.blockTime * 1000).toISOString() : null,
      fee: tx.meta?.fee ? tx.meta.fee / 1e9 : 0, // Convert to SOL
      status: tx.meta?.err ? 'failed' : 'success'
    }

    // Check transaction status
    if (tx.meta?.err) {
      patterns.push('failed_transaction')
      flags.push('Transaction failed on-chain')
      riskScore += 20
    }

    // Analyze fee
    const feeInSol = details.fee
    if (feeInSol > 0.01) {
      patterns.push('high_fee')
      flags.push(`High transaction fee: ${feeInSol.toFixed(6)} SOL`)
      riskScore += 10
    }

    // Analyze instructions
    const instructions = tx.transaction.message.instructions
    const programIds = new Set<string>()
    
    for (const ix of instructions) {
      if ('programId' in ix) {
        programIds.add(ix.programId.toString())
      }
      
      // Check for token transfers
      if (ix.programId?.toString() === 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA') {
        patterns.push('token_transfer')
      }
      
      // Check for DEX interactions (Jupiter, Raydium, etc.)
      const dexPrograms = [
        'JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4', // Jupiter
        '675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8', // Raydium
        'whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc', // Orca Whirlpool
        '9W959DqEETiGZocYWCQPaJ6sBmUzgfxXfqGeTEdp3aQP'  // Orca
      ]
      
      if (dexPrograms.includes(ix.programId?.toString() || '')) {
        patterns.push('dex_interaction')
      }
    }

    // Analyze account keys
    const accountKeys = tx.transaction.message.accountKeys
    const signerCount = accountKeys.filter(acc => acc.signer).length
    
    if (signerCount > 3) {
      patterns.push('multi_signer')
      flags.push(`Multiple signers detected: ${signerCount}`)
    }

    // Check for new/unknown accounts
    const writableAccounts = accountKeys.filter(acc => acc.writable)
    if (writableAccounts.length > 5) {
      patterns.push('many_writable_accounts')
      riskScore += 5
    }

    // Analyze pre/post balances
    const preBalances = tx.meta?.preBalances || []
    const postBalances = tx.meta?.postBalances || []
    
    let totalSolMoved = 0
    for (let i = 0; i < preBalances.length; i++) {
      const diff = Math.abs((preBalances[i] - postBalances[i]) / 1e9)
      totalSolMoved += diff
    }
    
    details.totalSolMoved = totalSolMoved
    
    if (totalSolMoved > 100) {
      patterns.push('large_value_transfer')
      flags.push(`Large value transfer: ${totalSolMoved.toFixed(2)} SOL`)
      riskScore += 15
    }

    // Check for associated token account changes
    const preTokenBalances = tx.meta?.preTokenBalances || []
    const postTokenBalances = tx.meta?.postTokenBalances || []
    
    if (preTokenBalances.length > 0 || postTokenBalances.length > 0) {
      patterns.push('token_balance_change')
      details.tokenAccountsChanged = preTokenBalances.length + postTokenBalances.length
    }

    // Recent transaction check (age)
    if (tx.blockTime) {
      const age = Date.now() / 1000 - tx.blockTime
      if (age < 300) { // Less than 5 minutes old
        patterns.push('very_recent_transaction')
      }
    }

    // Check compute units
    const computeUnits = tx.meta?.computeUnitsConsumed
    if (computeUnits) {
      details.computeUnitsConsumed = computeUnits
      if (computeUnits > 1000000) {
        patterns.push('high_compute_usage')
        flags.push(`High compute usage: ${computeUnits} units`)
      }
    }

    // Cap risk score at 100
    riskScore = Math.min(riskScore, 100)

    return {
      riskScore,
      patterns: [...new Set(patterns)],
      flags: [...new Set(flags)],
      details
    }
  } catch (error) {
    throw new Error(`Solana analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

async function analyzeEthereumTransaction(txHash: string, provider: ethers.JsonRpcProvider): Promise<any> {
  try {
    const tx = await provider.getTransaction(txHash)
    const receipt = await provider.getTransactionReceipt(txHash)
    
    if (!tx) {
      throw new Error('Transaction not found')
    }

    const patterns: string[] = []
    const flags: string[] = []
    let riskScore = 0

    const details: any = {
      from: tx.from,
      to: tx.to,
      value: ethers.formatEther(tx.value),
      gasLimit: tx.gasLimit?.toString(),
      gasPrice: tx.gasPrice ? ethers.formatUnits(tx.gasPrice, 'gwei') : null,
      maxFeePerGas: tx.maxFeePerGas ? ethers.formatUnits(tx.maxFeePerGas, 'gwei') : null,
      nonce: tx.nonce,
      chainId: tx.chainId?.toString()
    }

    if (receipt) {
      details.status = receipt.status === 1 ? 'success' : 'failed'
      details.gasUsed = receipt.gasUsed?.toString()
      details.effectiveGasPrice = receipt.gasPrice ? ethers.formatUnits(receipt.gasPrice, 'gwei') : null
      details.blockNumber = receipt.blockNumber
      details.confirmations = receipt.confirmations
      
      // Check status
      if (receipt.status === 0) {
        patterns.push('failed_transaction')
        flags.push('Transaction failed on-chain')
        riskScore += 20
      }

      // Check for contract creation
      if (!tx.to && receipt.contractAddress) {
        patterns.push('contract_creation')
        details.contractAddress = receipt.contractAddress
      }

      // Analyze logs for events
      const logs = receipt.logs
      const eventSignatures = new Set<string>()
      
      for (const log of logs) {
        if (log.topics[0]) {
          eventSignatures.add(log.topics[0])
        }
      }

      // Check for ERC20 Transfer events (0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef)
      const transferEventSig = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef'
      const hasTokenTransfer = logs.some(log => log.topics[0] === transferEventSig)
      
      if (hasTokenTransfer) {
        patterns.push('token_transfer')
      }

      // Check for Approval events
      const approvalEventSig = '0x8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925'
      const hasApproval = logs.some(log => log.topics[0] === approvalEventSig)
      
      if (hasApproval) {
        patterns.push('token_approval')
      }

      // Check for Swap events (Uniswap, Sushiswap, etc.)
      const swapEventSigs = [
        '0xd78ad95fa46c994b6551d0da85fc275fe613ce37657fb8d5e3d130840159d822', // Uniswap V2 Swap
        '0xc42079f94a6350d7e6235f29174924f928cc2ac818eb64fed8004e115fbcca67'  // Uniswap V3 Swap
      ]
      const hasSwap = logs.some(log => swapEventSigs.includes(log.topics[0]))
      
      if (hasSwap) {
        patterns.push('dex_swap')
      }

      // Large number of logs could indicate complex interaction
      if (logs.length > 10) {
        patterns.push('complex_interaction')
        flags.push(`Complex transaction with ${logs.length} events`)
        riskScore += 5
      }
    }

    // Check value transferred
    const valueInEth = parseFloat(details.value)
    if (valueInEth > 10) {
      patterns.push('large_value_transfer')
      flags.push(`Large ETH transfer: ${valueInEth.toFixed(4)} ETH`)
      riskScore += 15
    }

    // Check gas price
    if (tx.gasPrice) {
      const gasPriceGwei = parseFloat(ethers.formatUnits(tx.gasPrice, 'gwei'))
      if (gasPriceGwei > 100) {
        patterns.push('high_gas_price')
        flags.push(`High gas price: ${gasPriceGwei.toFixed(2)} gwei`)
      }
    }

    // Check if interacting with contract
    if (tx.to) {
      const code = await provider.getCode(tx.to)
      if (code !== '0x') {
        patterns.push('contract_interaction')
        details.contractAddress = tx.to
        
        // Check for known DeFi protocols
        const knownProtocols: Record<string, string> = {
          '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D': 'Uniswap V2 Router',
          '0xE592427A0AEce92De3Edee1F18E0157C05861564': 'Uniswap V3 Router',
          '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45': 'Uniswap V3 Universal Router',
          '0x1111111254eeb25477b68fb85ed929f73a960582': '1inch Router'
        }
        
        if (knownProtocols[tx.to.toLowerCase()]) {
          patterns.push('known_protocol')
          details.protocol = knownProtocols[tx.to.toLowerCase()]
        }
      }
    }

    // Check nonce (suspicious if very high)
    if (tx.nonce > 10000) {
      patterns.push('high_nonce_account')
      flags.push(`Account has high nonce: ${tx.nonce}`)
    }

    // Cap risk score at 100
    riskScore = Math.min(riskScore, 100)

    return {
      riskScore,
      patterns: [...new Set(patterns)],
      flags: [...new Set(flags)],
      details
    }
  } catch (error) {
    throw new Error(`Ethereum analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

function getRiskLevel(score: number): string {
  if (score <= 20) return 'low'
  if (score <= 50) return 'medium'
  if (score <= 80) return 'high'
  return 'critical'
}
