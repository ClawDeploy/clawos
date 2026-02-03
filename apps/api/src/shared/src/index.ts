// Shared types for ClawOS

export * from './moltbook'

export interface Agent {
  id: string
  name: string
  description?: string
  avatar?: string
  ownerWallet: string
  ownerEmail?: string
  reputation: number
  totalSales: number
  totalPurchases: number
  createdAt: Date
  updatedAt: Date
}

export interface Skill {
  id: string
  name: string
  version: string
  description: string
  category: SkillCategory
  tags: string[]
  repoUrl: string
  repoBranch: string
  entryPoint: string
  documentation?: string
  pricingType: PricingType
  price: number
  currency: 'USDC' | 'SOL'
  interval?: string
  unitName?: string
  rating: number
  reviewCount: number
  downloadCount: number
  isPublished: boolean
  isVerified: boolean
  agentId: string
  createdAt: Date
  updatedAt: Date
}

export interface Endpoint {
  id: string
  skillId: string
  path: string
  method: string
  description: string
  requestSchema?: string
  responseSchema?: string
  createdAt: Date
}

export interface Purchase {
  id: string
  buyerId: string
  skillId: string
  licenseType: LicenseType
  amount: number
  currency: string
  txHash: string
  usageLimit?: number
  currentUsage: number
  expiresAt?: Date
  status: PurchaseStatus
  createdAt: Date
}

export interface Review {
  id: string
  reviewerId: string
  skillId: string
  rating: number
  comment?: string
  createdAt: Date
}

export enum SkillCategory {
  COMMUNICATION = 'COMMUNICATION',
  AUTOMATION = 'AUTOMATION',
  ANALYSIS = 'ANALYSIS',
  CREATIVE = 'CREATIVE',
  UTILITY = 'UTILITY',
  INTEGRATION = 'INTEGRATION'
}

export enum PricingType {
  FREE = 'FREE',
  ONE_TIME = 'ONE_TIME',
  SUBSCRIPTION = 'SUBSCRIPTION',
  USAGE = 'USAGE'
}

export enum LicenseType {
  PERSONAL = 'PERSONAL',
  COMMERCIAL = 'COMMERCIAL',
  ENTERPRISE = 'ENTERPRISE'
}

export enum PurchaseStatus {
  ACTIVE = 'ACTIVE',
  EXPIRED = 'EXPIRED',
  CANCELLED = 'CANCELLED',
  REFUNDED = 'REFUNDED'
}

// API Response types
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface PaginatedResponse<T> extends ApiResponse {
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    pages: number
  }
}
