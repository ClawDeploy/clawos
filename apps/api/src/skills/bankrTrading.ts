// Bankr Trading Skill for ClawOS
// Enables AI agents to trade tokens, check balances, and analyze trends

import { Request, Response } from 'express';
import { BankrClient } from "@bankr/sdk";

interface BankrSkillInput {
  action: "swap" | "balance" | "trend" | "price";
  prompt?: string;
  tokenIn?: string;
  tokenOut?: string;
  amount?: string;
  walletAddress?: string;
}

// Express route handler
export const executeBankrSkill = async (req: Request, res: Response) => {
  try {
    const input: BankrSkillInput = req.body;
    
    // Validate input
    if (!input.action && !input.prompt) {
      return res.status(400).json({
        success: false,
        error: 'Either action or prompt must be provided'
      });
    }

    // Get Bankr API key from environment
    const bankrApiKey = process.env.BANKR_API_KEY;
    if (!bankrApiKey) {
      return res.status(500).json({
        success: false,
        error: 'Bankr API not configured'
      });
    }

    // Initialize Bankr client (using provided wallet or default)
    const client = new BankrClient({
      privateKey: bankrApiKey,
      walletAddress: input.walletAddress || process.env.DEFAULT_WALLET_ADDRESS
    });

    let prompt: string;

    // Build prompt based on action
    switch (input.action) {
      case "swap":
        if (!input.tokenIn || !input.tokenOut || !input.amount) {
          return res.status(400).json({
            success: false,
            error: 'swap action requires tokenIn, tokenOut, and amount'
          });
        }
        prompt = `Swap ${input.amount} ${input.tokenIn} to ${input.tokenOut}`;
        break;

      case "balance":
        prompt = "What are my current balances?";
        break;

      case "trend":
        prompt = "What are the trending coins on Base right now?";
        break;

      case "price":
        if (!input.tokenOut) {
          return res.status(400).json({
            success: false,
            error: 'price action requires tokenOut'
          });
        }
        prompt = `What's the current price of ${input.tokenOut}?`;
        break;

      default:
        if (input.prompt) {
          prompt = input.prompt;
        } else {
          return res.status(400).json({
            success: false,
            error: 'Invalid action'
          });
        }
    }

    // Execute Bankr prompt
    console.log(`Executing Bankr prompt: ${prompt}`);
    const result = await client.promptAndWait({ prompt });

    return res.json({
      success: true,
      response: result.response,
      data: {
        transactions: result.transactions || [],
        richData: result.richData || [],
        processingTime: result.processingTime,
        jobId: result.jobId
      },
      metadata: {
        cost: "0.10 USDC",
        network: "base",
        timestamp: new Date().toISOString(),
        prompt: prompt
      }
    });

  } catch (error: any) {
    console.error('Bankr skill error:', error);
    return res.status(500).json({
      success: false,
      error: `Error executing Bankr skill: ${error.message}`,
      data: {}
    });
  }
};

// Skill metadata for marketplace
export const bankrSkillMetadata = {
  id: "bankr-trading",
  name: "Bankr DeFi Trading",
  description: "AI-powered DeFi trading on Base. Swap tokens, check balances, analyze trends using natural language. Powered by Bankr API. Each request costs $0.10 USDC.",
  category: "defi",
  version: "1.0.0",
  price: 0.50,
  currency: "USDC",
  pricingType: "per_call",
  tags: ["trading", "defi", "swap", "ai", "base", "bankr"],
  icon: "💱",
  color: "#0052FF",
  exampleInputs: [
    { action: "swap", tokenIn: "ETH", tokenOut: "USDC", amount: "0.1" },
    { action: "trend" },
    { action: "balance" },
    { action: "price", tokenOut: "BNKR" }
  ]
};

export default executeBankrSkill;
