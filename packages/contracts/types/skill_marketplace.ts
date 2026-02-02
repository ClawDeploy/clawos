/**
 * TypeScript types for ClawOS Skill Marketplace
 * Auto-generated from IDL
 */

import { PublicKey } from '@solana/web3.js';
import type { BN } from '@coral-xyz/anchor';

// Program ID
export const PROGRAM_ID = new PublicKey('CLAWoSGaA5MzY1kzJ4k2g8fJ5v9xQzR7yTyUv9d9KdM3');

// USDC Mint Addresses
export const USDC_MINT = {
  mainnet: new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'),
  devnet: new PublicKey('4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU'),
  localnet: new PublicKey('4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU'),
};

// Account Types
export interface Marketplace {
  authority: PublicKey;
  treasury: PublicKey;
  platformFeeBps: number;
  skillCount: BN;
  bump: number;
}

export interface SkillListing {
  seller: PublicKey;
  skillId: string;
  price: BN;
  isSubscription: boolean;
  subscriptionDuration: BN | null;
  isActive: boolean;
  createdAt: BN;
  bump: number;
}

export interface License {
  owner: PublicKey;
  skillListing: PublicKey;
  purchasePrice: BN;
  platformFee: BN;
  isActive: boolean;
  usageCount: BN;
  expiresAt: BN | null;
  createdAt: BN;
  lastUsedAt: BN;
  bump: number;
}

// Event Types
export interface SkillListedEvent {
  seller: PublicKey;
  skillId: string;
  price: BN;
}

export interface SkillPurchasedEvent {
  buyer: PublicKey;
  seller: PublicKey;
  skillId: string;
  price: BN;
  license: PublicKey;
}

export interface PaymentClaimedEvent {
  seller: PublicKey;
  skillId: string;
  amount: BN;
  fee: BN;
}

// Error Codes
export enum ErrorCode {
  InvalidFee = 6000,
  SkillIdTooLong = 6001,
  InvalidSkill = 6002,
  SkillNotActive = 6003,
  Unauthorized = 6004,
  InvalidPrice = 6005,
}

// Instruction Args
export interface InitializeMarketplaceArgs {
  platformFeeBps: number;
}

export interface ListSkillArgs {
  skillId: string;
  price: BN;
  isSubscription: boolean;
  subscriptionDuration: BN | null;
}

export interface PurchaseSkillArgs {
  skillId: string;
}

export interface UpdateSkillStatusArgs {
  isActive: boolean;
}

// Account Inputs
export interface InitializeMarketplaceAccounts {
  marketplace: PublicKey;
  authority: PublicKey;
  treasury: PublicKey;
  systemProgram: PublicKey;
}

export interface ListSkillAccounts {
  marketplace: PublicKey;
  skillListing: PublicKey;
  seller: PublicKey;
  systemProgram: PublicKey;
}

export interface PurchaseSkillAccounts {
  marketplace: PublicKey;
  skillListing: PublicKey;
  license: PublicKey;
  buyer: PublicKey;
  buyerTokenAccount: PublicKey;
  escrowTokenAccount: PublicKey;
  usdcMint: PublicKey;
  tokenProgram: PublicKey;
  systemProgram: PublicKey;
  rent: PublicKey;
}

export interface ClaimPaymentAccounts {
  marketplace: PublicKey;
  skillListing: PublicKey;
  seller: PublicKey;
  escrowTokenAccount: PublicKey;
  sellerTokenAccount: PublicKey;
  treasuryTokenAccount: PublicKey;
  usdcMint: PublicKey;
  tokenProgram: PublicKey;
}

export interface VerifyLicenseAccounts {
  license: PublicKey;
  owner: PublicKey;
}

export interface UpdateSkillStatusAccounts {
  skillListing: PublicKey;
  seller: PublicKey;
}

// Helper types
export type LicenseStatus = 'Active' | 'Inactive' | 'Expired';

export interface PurchaseResult {
  signature: string;
  license: PublicKey;
  escrow: PublicKey;
}

export interface ListingResult {
  signature: string;
  skillListing: PublicKey;
}

export interface ClaimResult {
  signature: string;
  amount: number;
  fee: number;
}
