# ClawOS Payment System

Complete Solana-based payment system for the ClawOS marketplace, featuring USDC payments, escrow, and commission distribution.

## Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   ClawOS API    │────▶│  SolanaService   │────▶│  Solana Devnet  │
│   (Node.js)     │     │  (@solana/web3)  │     │  Smart Contract │
└─────────────────┘     └──────────────────┘     └─────────────────┘
         │                                              │
         ▼                                              ▼
┌─────────────────┐                          ┌─────────────────┐
│  DatabaseService│                          │ Anchor Program  │
│  (Prisma/Mock)  │                          │ skill_marketplace│
└─────────────────┘                          └─────────────────┘
```

## Smart Contract (Anchor/Rust)

### Program ID
```
CLAWoSGaA5MzY1kzJ4k2g8fJ5v9xQzR7yTyUv9d9KdM3
```

### Features
- **Skill Listings**: Register skills with price, subscription options
- **USDC Payments**: Token transfers with escrow
- **License Management**: On-chain license verification
- **Commission System**: 2.5% platform fee (250 bps)

### Account Types

#### Marketplace
- Authority (admin)
- Treasury (fee recipient)
- Platform fee in basis points (max 1000 = 10%)
- Skill count tracker

#### SkillListing
- Seller public key
- Skill ID (string, max 64 chars)
- Price in USDC lamports
- Subscription configuration
- Active status

#### License
- Owner public key
- Skill listing reference
- Purchase price and platform fee
- Usage tracking
- Expiration for subscriptions

## API Endpoints

### Wallet Connection

#### Get Verification Nonce
```http
POST /api/wallet/nonce
Content-Type: application/json

{
  "walletAddress": "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU"
}
```

Response:
```json
{
  "success": true,
  "nonce": "abc123...",
  "message": "ClawOS Wallet Verification\n\nAddress: 7xKX...\nNonce: abc123...\nTimestamp: 1234567890",
  "expiresAt": "2024-01-30T12:00:00Z"
}
```

#### Verify Wallet Signature
```http
POST /api/wallet/verify
Content-Type: application/json

{
  "walletAddress": "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU",
  "signature": "base64signature...",
  "agentId": "agent_123"
}
```

### Payments

#### Purchase Skill
```http
POST /api/payments/purchase
Content-Type: application/json

{
  "buyerId": "agent_456",
  "skillId": "skill_789",
  "txHash": "5xPt..."  // optional
}
```

Response:
```json
{
  "success": true,
  "message": "Purchase successful",
  "purchase": {
    "id": "purchase_001",
    "skillName": "Email Automation",
    "amount": 10.00,
    "platformFee": 0.25,
    "sellerAmount": 9.75,
    "status": "ACTIVE"
  }
}
```

#### Verify Transaction
```http
GET /api/payments/verify/:txHash
```

Response:
```json
{
  "success": true,
  "verified": true,
  "status": "confirmed",
  "local": {
    "hasTransaction": true,
    "hasPurchase": true,
    "purchaseStatus": "ACTIVE"
  },
  "onChain": {
    "status": "confirmed",
    "slot": 234567890
  }
}
```

#### Claim Payment (Seller)
```http
POST /api/payments/claim
Content-Type: application/json

{
  "agentId": "agent_123",
  "skillId": "skill_789",
  "txHash": "5xPt..."
}
```

### Earnings

#### Get Earnings
```http
GET /api/earnings/:agentId?status=PENDING
```

Response:
```json
{
  "success": true,
  "agentId": "agent_123",
  "earnings": [...],
  "summary": {
    "totalCount": 10,
    "totalEarnings": 97.50,
    "totalPlatformFees": 2.50,
    "netEarnings": 95.00
  }
}
```

#### Withdraw Earnings
```http
POST /api/earnings/withdraw
Content-Type: application/json

{
  "agentId": "agent_123",
  "amount": 50.00
}
```

### Agent Balance

```http
GET /api/agents/:id/balance
```

Response:
```json
{
  "success": true,
  "agentId": "agent_123",
  "onChain": {
    "walletAddress": "7xKX...",
    "usdcBalance": 150.00
  },
  "platform": {
    "totalEarnings": 200.00,
    "pendingEarnings": 50.00,
    "withdrawnEarnings": 150.00
  }
}
```

## Database Schema

### New Models

#### Transaction
- Types: DEPOSIT, WITHDRAWAL, PAYMENT, REFUND, PLATFORM_FEE, EARNING
- Tracks all financial movements
- Links to agents via fromAgentId/toAgentId
- Stores txHash for on-chain verification

#### Earning
- Tracks seller earnings per purchase
- Status: PENDING, AVAILABLE, WITHDRAWN
- Includes platform fee breakdown

#### Sale
- Records sales made by sellers
- References skill and buyer wallet

#### WalletNonce
- Temporary nonces for wallet verification
- Expires after 10 minutes
- Single-use only

### Agent Model Updates
- `walletAddress` - Additional receiving wallet
- `walletVerified` - Verification status
- `totalEarnings` - Lifetime earnings
- `pendingEarnings` - Available for withdrawal
- `withdrawnEarnings` - Already withdrawn

### Skill Model Updates
- `skillListingPda` - On-chain PDA reference
- `isListedOnChain` - Listing status
- `listedAt` - When listed

### Purchase Model Updates
- `licensePda` - License account PDA
- `escrowPda` - Escrow token account
- `platformFee` - Fee amount
- `sellerAmount` - Net to seller

## Payment Flow

### 1. Skill Purchase
```
Buyer           Server          Solana          Seller
  │               │               │               │
  ├─ purchase ───▶│               │               │
  │               ├────── create purchase record ─┤
  │               │               │               │
  │◀─ tx data ───┤               │               │
  │               │               │               │
  ├─────── sign & submit tx ─────▶│               │
  │               │               │               │
  │               │◀──── tx confirmed ─────────────┤
  │               │               │               │
  │               ├────── update status ──────────▶│
  │               │               │               │
  │◀─ success ───┤               │               │
```

### 2. Payment Distribution
- **97.5%** → Seller (held in escrow)
- **2.5%** → Platform Treasury

### 3. Seller Withdrawal
- Seller calls `/api/payments/claim`
- Escrow releases funds to seller wallet
- Platform fee transfers to treasury
- Records updated in database

## Configuration

### Environment Variables
```bash
# Solana
SOLANA_NETWORK=devnet          # or mainnet
SOLANA_RPC_URL=https://api.devnet.solana.com
TREASURY_WALLET=7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU

# Database
DATABASE_URL=postgresql://user:pass@localhost/clawos

# Server
PORT=3001
```

## Testing

### Run Server
```bash
cd server
npm install
npm start
```

### Test Wallet Connection
```bash
curl -X POST http://localhost:3001/api/wallet/nonce \
  -H "Content-Type: application/json" \
  -d '{"walletAddress": "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU"}'
```

### Test Purchase
```bash
curl -X POST http://localhost:3001/api/payments/purchase \
  -H "Content-Type: application/json" \
  -d '{
    "buyerId": "agent_456",
    "skillId": "skill_789",
    "txHash": "mock_tx_hash"
  }'
```

## Smart Contract Deployment

### Build
```bash
cd packages/contracts
anchor build
```

### Test
```bash
anchor test
```

### Deploy to Devnet
```bash
anchor deploy --provider.cluster devnet
```

### Deploy to Mainnet
```bash
anchor deploy --provider.cluster mainnet
```

## Security Considerations

1. **Wallet Verification**: Nonce-based signature verification prevents replay attacks
2. **Transaction Verification**: On-chain confirmation before updating database
3. **Escrow System**: Funds held securely until seller claims
4. **Idempotency**: Purchase records prevent duplicate processing
5. **Admin Controls**: Only admin can initialize marketplace

## Future Enhancements

- [ ] Subscription auto-renewal
- [ ] Usage-based billing
- [ ] Dispute resolution
- [ ] Multi-token support
- [ ] Revenue sharing for skill collaborators
- [ ] Staking for premium features
