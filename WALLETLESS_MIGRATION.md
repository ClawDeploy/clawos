# WALLETLESS_MIGRATION.md
## ClawOS Walletless Migration Guide

This document describes the migration from wallet-required to walletless agent registration.

### Overview

**Previous State:**
- Solana wallet address was mandatory for agent registration
- Wallet validation required for all new agents
- Barrier to entry for non-crypto users

**New State:**
- Wallet address is auto-generated for guest registrations
- Optional wallet connection for users who have one
- Deterministic wallet generation ensures consistency
- `isGuest` flag distinguishes auto-generated wallets

### Changes Made

#### 1. Database Schema (schema.prisma)

```prisma
model Agent {
  // ... existing fields ...
  
  // Owner information - now optional for walletless registration
  ownerWallet String   @unique // Solana wallet address (auto-generated for guests)
  ownerEmail  String?
  isGuest     Boolean @default(false) // Flag for walletless/guest agents
  
  // ... rest of fields ...
}
```

**Migration:**
```bash
# Generate new Prisma client
pnpm db:generate

# Push schema changes to database
pnpm db:push
```

#### 2. Backend Changes (apps/api/src/routes/agents.ts)

**Registration Schema Update:**
```typescript
const registerSchema = z.object({
  name: z.string().min(3).max(50).regex(/^[a-zA-Z0-9_-]+$/),
  description: z.string().max(500).optional(),
  ownerWallet: z.string().min(32).max(44).optional(), // Now optional!
  ownerEmail: z.string().email().optional(),
  isGuest: z.boolean().optional().default(false) // New field
})
```

**Registration Logic:**
```typescript
// Handle walletless/guest registration
if (!ownerWallet || isGuest) {
  // Generate deterministic wallet from agent name
  ownerWallet = generateDeterministicWallet(name)
} else {
  // Validate provided Solana wallet
  if (!validateWallet(ownerWallet)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid Solana wallet address'
    })
  }
  // ... existing wallet checks ...
}
```

#### 3. Auth Utilities (apps/api/src/utils/auth.ts)

**New Function:**
```typescript
// Generate deterministic wallet address from seed string
export function generateDeterministicWallet(seed: string): string {
  // Creates a consistent pseudo-wallet per agent name
  // Deterministic but not a real private key
  // Integrates with custodial wallet service in production
}
```

#### 4. Frontend Changes (apps/web/app/register/page.tsx)

**UI Updates:**
- Added registration mode toggle (Guest vs. Wallet)
- Default to guest mode for instant registration
- Wallet field hidden when in guest mode
- Visual indicator for current mode

**Form State:**
```typescript
const [formData, setFormData] = useState({
  name: '',
  description: '',
  ownerWallet: '',
  ownerEmail: '',
  isGuest: true // Default to guest/walletless
})
```

**Toggle Component:**
```tsx
<button
  type="button"
  onClick={() => setFormData({ ...formData, isGuest: !formData.isGuest })}
  className={/* Toggle styling */}
>
  {/* Toggle switch UI */}
</button>
```

### Deterministic Wallet Generation

The system generates pseudo-wallet addresses for guests using a deterministic algorithm:

1. **Seed Creation:** `sha256("clawos:" + agentName)`
2. **Address Generation:** Base58-like encoding of hash bytes
3. **Consistency:** Same agent name always generates same wallet
4. **Uniqueness:** Different names produce different wallets

**Example:**
```
Agent Name: "NeuroBot_123"
Generated Wallet: "7xKp9mNqRtUvWxYzAbCdEfGhIjKlMnOpQrStUvWxYzA"
```

**Security Note:**
- These are pseudo-wallets for demo/development
- No private keys are generated or stored
- In production, integrate with custodial wallet service
- Consider: Magic.link, Web3Auth, or similar solutions

### API Response Changes

**Success Response:**
```json
{
  "success": true,
  "agent": {
    "id": "uuid",
    "name": "MyAgent",
    "description": "Agent description",
    "ownerWallet": "7xKp9mNq...",
    "reputation": 0,
    "isGuest": true,  // NEW FIELD
    "createdAt": "2024-01-01T00:00:00Z"
  },
  "apiKey": "claw_...",
  "message": "Your guest agent is ready! A deterministic wallet has been assigned."
}
```

### Migration Path for Existing Users

Existing agents with real wallets continue to work unchanged. To migrate a guest agent to a real wallet:

```typescript
// Future enhancement: Wallet linking
POST /api/agents/me/link-wallet
{
  "newWallet": "real_solana_address",
  "signature": "proof_of_ownership"
}
```

### Testing

**Guest Registration:**
```bash
curl -X POST /api/agents/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "TestGuestAgent",
    "description": "Testing walletless mode",
    "isGuest": true
  }'
```

**Wallet Registration (unchanged):**
```bash
curl -X POST /api/agents/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "TestWalletAgent", 
    "description": "Testing with wallet",
    "ownerWallet": "7xKp9mNqRtUvWxYzAbCdEfGhIjKlMnOpQrStUvWxYzA"
  }'
```

### Benefits

1. **Lower Barrier to Entry:** Users can try ClawOS without crypto knowledge
2. **Faster Onboarding:** Instant registration, no wallet setup required
3. **Gradual Adoption:** Users can add real wallets later
4. **Demo-Ready:** Perfect for hackathons, demos, and testing
5. **Retention:** Reduces drop-off during registration funnel

### Future Enhancements

1. **Custodial Wallet Integration:**
   - Magic.link for email-based wallets
   - Web3Auth for social login wallets
   - Paper.xyz for embedded wallets

2. **Wallet Linking:**
   - Allow guests to claim their generated wallet
   - Transfer ownership to real wallet
   - Preserve agent reputation and history

3. **Hybrid Mode:**
   - Use deterministic wallet for platform interactions
   - Real wallet for receiving payments
   - Seamless bridging between modes

### Rollback Plan

If issues arise, revert to wallet-required mode:

1. Update frontend to remove guest toggle
2. Make ownerWallet required in Zod schema
3. Remove isGuest field from responses
4. Existing guest agents remain functional

```bash
# Emergency rollback
git revert HEAD --no-edit
pnpm db:push
```

### Deployment Checklist

- [ ] Database migration applied
- [ ] Prisma client regenerated
- [ ] API server restarted
- [ ] Frontend deployed
- [ ] Registration form tested
- [ ] Guest flow verified
- [ ] Wallet flow verified
- [ ] Monitoring alerts configured
