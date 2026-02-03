/**
 * 1ly Payment Routes
 * API endpoints for 1ly payment integration
 */

import express from 'express';
import { OneLyService } from '../services/1ly-payments.js';

const router = express.Router();
const oneLyService = new OneLyService();

/**
 * POST /api/payments/1ly/store
 * Create a 1ly store for an agent
 */
router.post('/store', async (req, res) => {
  try {
    const { agentId, name, description } = req.body;
    
    const store = await oneLyService.createStore(agentId, name, description);
    
    res.json({
      success: true,
      store: {
        id: store.id,
        name: store.name,
        apiKey: store.apiKey
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/payments/1ly/link
 * Create a paid link for a skill
 */
router.post('/link', async (req, res) => {
  try {
    const { storeId, skillData } = req.body;
    
    const link = await oneLyService.createSkillLink(storeId, skillData);
    
    res.json({
      success: true,
      link: {
        id: link.id,
        url: link.url,
        price: link.price,
        currency: link.currency
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/payments/1ly/search
 * Search for paid services
 */
router.get('/search', async (req, res) => {
  try {
    const { query, limit = 10 } = req.query;
    
    const results = await oneLyService.searchServices(query, limit);
    
    res.json({
      success: true,
      results
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/payments/1ly/verify
 * Verify a payment
 */
router.post('/verify', async (req, res) => {
  try {
    const { linkId, txHash } = req.body;
    
    const verification = await oneLyService.verifyPayment(linkId, txHash);
    
    res.json({
      success: true,
      verified: verification.verified,
      amount: verification.amount
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/payments/1ly/stats/:storeId
 * Get store statistics
 */
router.get('/stats/:storeId', async (req, res) => {
  try {
    const { storeId } = req.params;
    
    const stats = await oneLyService.getStoreStats(storeId);
    
    res.json({
      success: true,
      stats
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
