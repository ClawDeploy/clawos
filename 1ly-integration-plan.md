# 1ly Payments Integration for ClawOS

## Overview
Integrate 1ly MCP payment system into ClawOS for agent-to-agent USDC payments.

## Architecture

```
ClawOS Backend (Node.js)
├── MCP Server (@1ly/mcp-server)
├── Wallet Manager
├── Payment Controller
└── API Routes
```

## Setup Steps

### 1. Install MCP Server

```bash
npm install @1ly/mcp-server
```

### 2. Environment Variables

Add to `.env`:
```env
# 1ly Configuration
ONELY_WALLET_SOLANA_KEY=/path/to/solana-wallet.json
ONELY_BUDGET_PER_CALL=1.00
ONELY_BUDGET_DAILY=50.00
ONELY_NETWORK=solana-mainnet
ONELY_API_KEY=your_1ly_api_key
```

### 3. Wallet Setup

Each agent needs a Solana wallet:
```javascript
// Generate or load wallet
const wallet = Keypair.generate();
// Save to secure storage
```

### 4. MCP Server Integration

```javascript
// server/mcp/1ly-server.js
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

export class OneLyPaymentService {
  constructor() {
    this.client = null;
  }

  async connect() {
    const transport = new StdioClientTransport({
      command: 'npx',
      args: ['@1ly/mcp-server'],
      env: {
        ONELY_WALLET_SOLANA_KEY: process.env.ONELY_WALLET_SOLANA_KEY,
        ONELY_BUDGET_PER_CALL: process.env.ONELY_BUDGET_PER_CALL,
        ONELY_BUDGET_DAILY: process.env.ONELY_BUDGET_DAILY,
      }
    });

    this.client = new Client({ name: 'clawos-client', version: '1.0.0' });
    await this.client.connect(transport);
  }

  // Buyer Methods
  async searchServices(query, limit = 10) {
    return await this.client.callTool('1ly_search', { query, limit });
  }

  async getServiceDetails(linkId) {
    return await this.client.callTool('1ly_get_details', { linkId });
  }

  async callPaidService(endpoint, payload) {
    return await this.client.callTool('1ly_call', { endpoint, payload });
  }

  // Seller Methods
  async createStore(name, description) {
    return await this.client.callTool('1ly_create_store', { name, description });
  }

  async createLink(name, price, endpoint, visibility = 'public') {
    return await this.client.callTool('1ly_create_link', {
      name,
      price: price.toString(),
      currency: 'USDC',
      endpoint,
      visibility
    });
  }

  async getStats() {
    return await this.client.callTool('1ly_get_stats', {});
  }
}
```

### 5. API Routes

```javascript
// routes/payments.js
import express from 'express';
import { OneLyPaymentService } from '../mcp/1ly-server.js';

const router = express.Router();
const paymentService = new OneLyPaymentService();

// Initialize on startup
await paymentService.connect();

// Search for paid services
router.get('/search', async (req, res) => {
  const { query, limit } = req.query;
  const results = await paymentService.searchServices(query, limit);
  res.json(results);
});

// Create payment link for skill
router.post('/skills/:skillId/link', async (req, res) => {
  const { skillId } = req.params;
  const skill = await getSkill(skillId);
  
  const link = await paymentService.createLink(
    skill.name,
    skill.price,
    `${API_URL}/api/skills/${skillId}/execute`,
    'public'
  );
  
  res.json(link);
});

// Execute paid skill
router.post('/execute/:linkId', async (req, res) => {
  const { linkId } = req.params;
  const { payload } = req.body;
  
  // Payment is handled automatically by 1ly
  const result = await paymentService.callPaidService(linkId, payload);
  res.json(result);
});

export default router;
```

### 6. Database Schema Updates

```sql
-- Add 1ly integration to skills table
ALTER TABLE skills ADD COLUMN 1ly_link_id VARCHAR(255);
ALTER TABLE skills ADD COLUMN 1ly_store_id VARCHAR(255);
ALTER TABLE skills ADD COLUMN payment_provider VARCHAR(50) DEFAULT 'native';

-- Add agent wallet table
CREATE TABLE agent_wallets (
  id SERIAL PRIMARY KEY,
  agent_id VARCHAR(255) REFERENCES agents(id),
  solana_address VARCHAR(255),
  solana_key_encrypted TEXT,
  balance_usdc DECIMAL(10,6),
  created_at TIMESTAMP DEFAULT NOW()
);
```

### 7. Frontend Updates

```javascript
// Update skill card to show 1ly payment
const SkillCard = ({ skill }) => {
  const handleBuy = async () => {
    if (skill.payment_provider === '1ly') {
      // Redirect to 1ly payment page
      window.open(`https://1ly.store/${skill.1ly_link_id}`, '_blank');
    } else {
      // Native ClawOS payment
      await buySkill(skill.id);
    }
  };

  return (
    <div className="skill-card">
      <h3>{skill.name}</h3>
      <p>${skill.price} USDC</p>
      <button onClick={handleBuy}>Buy via 1ly</button>
    </div>
  );
};
```

## Usage Examples

### Agent Creates Paid Skill
```javascript
// POST /api/agents/:id/skills
{
  "name": "Text Summarizer",
  "description": "Summarize long text",
  "price": 0.50,
  "payment_provider": "1ly"
}

// Response:
{
  "skill_id": "skill_123",
  "1ly_link": "https://1ly.store/l/abc123",
  "1ly_link_id": "abc123"
}
```

### Buyer Uses Skill
```javascript
// Buyer calls the 1ly link
// Payment + execution happens automatically
const result = await fetch('https://1ly.store/l/abc123', {
  method: 'POST',
  body: JSON.stringify({ text: "Long text to summarize..." })
});
```

## Security Considerations

1. **Wallet Keys**: Never expose private keys in frontend
2. **Budget Limits**: Always set `ONELY_BUDGET_PER_CALL` and `ONELY_BUDGET_DAILY`
3. **API Keys**: Store 1ly API keys securely (not in code)
4. **Encryption**: Encrypt wallet private keys at rest

## Testing

```bash
# Test MCP connection
npm run test:1ly

# Test payment flow
npm run test:payment
```

## Deployment

1. Set environment variables on Render/Vercel
2. Deploy MCP server alongside ClawOS API
3. Test with small USDC amounts first
4. Monitor transaction logs

## Benefits

- ✅ Agent-native payments
- ✅ Automatic x402 protocol handling
- ✅ USDC on Solana/Base
- ✅ No custom payment code needed
- ✅ Budget limits & guardrails
