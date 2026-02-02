#!/usr/bin/env node
/**
 * Test script for ClawOS Payment System
 * Run with: node test-payments.js
 */

const http = require('http');

const BASE_URL = 'localhost';
const PORT = 3001;

// Simple HTTP request helper
function request(path, method = 'GET', data = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: BASE_URL,
      port: PORT,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(body));
        } catch {
          resolve(body);
        }
      });
    });

    req.on('error', reject);
    
    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

// Test results
const results = [];

async function test(name, fn) {
  try {
    await fn();
    console.log(`✅ ${name}`);
    results.push({ name, status: 'pass' });
  } catch (error) {
    console.log(`❌ ${name}: ${error.message}`);
    results.push({ name, status: 'fail', error: error.message });
  }
}

async function runTests() {
  console.log('🧪 Testing ClawOS Payment System\n');
  console.log('=' .repeat(50));

  // Store test data
  let sellerId, buyerId, skillId, txHash;

  // Test 1: Health Check
  await test('Health check', async () => {
    const res = await request('/health');
    if (res.status !== 'ok') throw new Error('Health check failed');
  });

  // Test 2: Register Seller Agent
  await test('Register seller agent', async () => {
    const res = await request('/api/agents/register', 'POST', {
      name: 'Test Seller ' + Date.now(),
      description: 'A test seller agent',
      ownerWallet: '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU'
    });
    if (!res.success) throw new Error(res.error);
    sellerId = res.agent.id;
  });

  // Test 3: Register Buyer Agent
  await test('Register buyer agent', async () => {
    const res = await request('/api/agents/register', 'POST', {
      name: 'Test Buyer ' + Date.now(),
      description: 'A test buyer agent',
      ownerWallet: '8yLYuh3DX98dU8YUjTEqcE6kClhfUrBVZuKptihtBfV'
    });
    if (!res.success) throw new Error(res.error);
    buyerId = res.agent.id;
  });

  // Test 4: Get Wallet Nonce
  await test('Get wallet nonce', async () => {
    const res = await request('/api/wallet/nonce', 'POST', {
      walletAddress: '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU'
    });
    if (!res.success || !res.nonce) throw new Error('Failed to get nonce');
  });

  // Test 5: Create Skill
  await test('Create skill', async () => {
    const res = await request('/api/skills', 'POST', {
      agentId: sellerId,
      name: 'Test Skill ' + Date.now(),
      description: 'A test skill for payment testing',
      category: 'AUTOMATION',
      pricingType: 'ONE_TIME',
      price: 10.00,
      currency: 'USDC',
      repoUrl: 'https://github.com/test/skill'
    });
    if (!res.success) throw new Error(res.error);
    skillId = res.skill.id;
  });

  // Test 6: List Skill on Marketplace
  await test('List skill on marketplace', async () => {
    const res = await request(`/api/skills/${skillId}/list`, 'POST', {
      price: 10.00,
      isSubscription: false
    });
    if (!res.success) throw new Error(res.error);
  });

  // Test 7: Get Marketplace
  await test('Get marketplace', async () => {
    const res = await request('/api/marketplace');
    if (!res.skills || res.total === 0) throw new Error('No skills in marketplace');
  });

  // Test 8: Purchase Skill
  await test('Purchase skill', async () => {
    const res = await request('/api/payments/purchase', 'POST', {
      buyerId: buyerId,
      skillId: skillId
    });
    if (!res.success) throw new Error(res.error);
    txHash = res.purchase.id; // Using purchase ID as mock tx hash
  });

  // Test 9: Get Agent Balance
  await test('Get agent balance', async () => {
    const res = await request(`/api/agents/${sellerId}/balance`);
    if (!res.success) throw new Error(res.error);
  });

  // Test 10: Get Agent Stats
  await test('Get agent stats', async () => {
    const res = await request(`/api/agents/${sellerId}/stats`);
    if (!res.success) throw new Error(res.error);
  });

  // Test 11: Get Earnings
  await test('Get seller earnings', async () => {
    const res = await request(`/api/earnings/${sellerId}`);
    if (!res.success) throw new Error(res.error);
    if (res.summary.totalEarnings <= 0) throw new Error('No earnings recorded');
  });

  // Test 12: Get Payment History
  await test('Get payment history', async () => {
    const res = await request(`/api/payments/history/${buyerId}`);
    if (!res.success) throw new Error(res.error);
  });

  // Test 13: Verify Transaction
  await test('Verify transaction', async () => {
    const res = await request(`/api/payments/verify/mock_tx_hash`);
    if (!res.success) throw new Error(res.error);
  });

  // Test 14: Claim Payment
  await test('Claim payment', async () => {
    const res = await request('/api/payments/claim', 'POST', {
      agentId: sellerId,
      skillId: skillId
    });
    if (!res.success) throw new Error(res.error);
  });

  // Test 15: Withdraw Earnings
  await test('Withdraw earnings', async () => {
    const res = await request('/api/earnings/withdraw', 'POST', {
      agentId: sellerId,
      amount: 5.00
    });
    if (!res.success) throw new Error(res.error);
  });

  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('📊 Test Summary\n');
  
  const passed = results.filter(r => r.status === 'pass').length;
  const failed = results.filter(r => r.status === 'fail').length;
  
  console.log(`Total: ${results.length}`);
  console.log(`Passed: ${passed} ✅`);
  console.log(`Failed: ${failed} ❌`);
  
  if (failed > 0) {
    console.log('\nFailed tests:');
    results.filter(r => r.status === 'fail').forEach(r => {
      console.log(`  - ${r.name}: ${r.error}`);
    });
  }
  
  console.log('\n' + (failed === 0 ? '🎉 All tests passed!' : '⚠️ Some tests failed'));
  
  return failed === 0;
}

// Check if server is running
async function checkServer() {
  try {
    await request('/health');
    return true;
  } catch {
    return false;
  }
}

// Main
async function main() {
  console.log('🔍 Checking server...\n');
  
  const isRunning = await checkServer();
  if (!isRunning) {
    console.log('❌ Server is not running!');
    console.log('   Start it with: cd server && npm start');
    process.exit(1);
  }
  
  console.log('✅ Server is running\n');
  
  const success = await runTests();
  process.exit(success ? 0 : 1);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
