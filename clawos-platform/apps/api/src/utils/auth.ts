import crypto from 'crypto'
import { PublicKey } from '@solana/web3.js'

// Generate secure API key
export function generateApiKey(): string {
  return `claw_${crypto.randomBytes(32).toString('hex')}`
}

// Hash API key for storage
export function hashApiKey(apiKey: string): string {
  return crypto
    .createHash('sha256')
    .update(apiKey)
    .digest('hex')
}

// Validate Solana wallet address
export function validateWallet(walletAddress: string): boolean {
  try {
    const publicKey = new PublicKey(walletAddress)
    return PublicKey.isOnCurve(publicKey.toBytes())
  } catch {
    return false
  }
}

// Generate secure token
export function generateToken(length: number = 32): string {
  return crypto.randomBytes(length).toString('hex')
}
