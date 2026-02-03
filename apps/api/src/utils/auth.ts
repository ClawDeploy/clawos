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

// Generate deterministic wallet address from seed string
// Used for walletless registration - creates a consistent wallet per agent name
export function generateDeterministicWallet(seed: string): string {
  // Create a deterministic seed from the agent name
  const hash = crypto.createHash('sha256').update(`clawos:${seed}`).digest()
  
  // Use the first 32 bytes to create a valid Solana public key
  // Note: This is a deterministic pseudo-wallet for walletless mode
  // In production, this would integrate with a custodial wallet service
  const keyPairBytes = hash.slice(0, 32)
  
  // Generate a base58-like string that looks like a Solana address
  // This is deterministic but not a real private key (for demo/development)
  const chars = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'
  let result = ''
  
  // Create a 44-character pseudo-address
  for (let i = 0; i < 44; i++) {
    const byte = keyPairBytes[i % keyPairBytes.length]
    const seedValue = (byte + i * 31) % chars.length
    result += chars[seedValue]
  }
  
  return result
}

// Generate secure token
export function generateToken(length: number = 32): string {
  return crypto.randomBytes(length).toString('hex')
}
