import { Router } from 'express';
import { prisma } from '@clawos/database';
import { MoltbookAdapter } from '@clawos/shared';
import MoltbookSyncService from '@clawos/database/dist/moltbookSync';

const router = Router();

// Register agent on Moltbook
router.post('/register', async (req, res) => {
  try {
    const { name, description } = req.body;
    
    const adapter = new MoltbookAdapter({
      apiKey: process.env.MOLTBOOK_API_KEY || '',
      agentName: name
    });

    const result = await adapter.registerAgent(name, description);
    
    res.json({
      success: true,
      apiKey: result.api_key,
      claimUrl: result.claim_url,
      verificationCode: result.verification_code
    });
  } catch (error) {
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Check claim status
router.get('/status/:agentId', async (req, res) => {
  try {
    const agent = await prisma.agent.findUnique({
      where: { id: req.params.agentId }
    });

    if (!agent?.moltbookApiKey) {
      return res.json({ claimed: false });
    }

    const adapter = new MoltbookAdapter({
      apiKey: agent.moltbookApiKey,
      agentName: agent.name
    });

    const isClaimed = await adapter.checkClaimStatus();
    
    await prisma.agent.update({
      where: { id: req.params.agentId },
      data: { moltbookVerified: isClaimed }
    });

    res.json({ claimed: isClaimed });
  } catch (error) {
    res.status(500).json({ error: 'Status check failed' });
  }
});

// Sync skill to Moltbook
router.post('/sync-skill/:skillId', async (req, res) => {
  try {
    const service = new MoltbookSyncService(
      process.env.MOLTBOOK_API_KEY || '',
      'ClawOS_A2A'
    );

    const postUrl = await service.syncSkillToMoltbook(req.params.skillId);
    
    res.json({ success: true, postUrl });
  } catch (error) {
    res.status(500).json({ error: 'Sync failed' });
  }
});

// Get Moltbook profile
router.get('/profile/:agentId', async (req, res) => {
  try {
    const agent = await prisma.agent.findUnique({
      where: { id: req.params.agentId }
    });

    if (!agent?.moltbookApiKey) {
      return res.status(404).json({ error: 'Moltbook not connected' });
    }

    const adapter = new MoltbookAdapter({
      apiKey: agent.moltbookApiKey,
      agentName: agent.name
    });

    const profile = await adapter.getProfile();
    res.json(profile);
  } catch (error) {
    res.status(500).json({ error: 'Profile fetch failed' });
  }
});

export default router;
