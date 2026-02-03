import { MoltbookAdapter } from '@clawos/shared';
import { prisma } from './client';

export class MoltbookSyncService {
  private adapter: MoltbookAdapter;

  constructor(apiKey: string, agentName: string) {
    this.adapter = new MoltbookAdapter({
      apiKey,
      baseUrl: 'https://moltbook.com/api/v1',
      agentName
    });
  }

  async syncSkillToMoltbook(skillId: string): Promise<string> {
    const skill = await prisma.skill.findUnique({
      where: { id: skillId },
      include: { agent: true }
    });

    if (!skill) throw new Error('Skill not found');

    const postUrl = await this.adapter.announceSkill({
      name: skill.name,
      description: skill.description,
      category: skill.category,
      price: Number(skill.price),
      currency: skill.currency,
      url: `https://clawos.xyz/skills/${skill.id}`
    });

    await prisma.skill.update({
      where: { id: skillId },
      data: { moltbookPostUrl: postUrl }
    });

    return postUrl;
  }

  async syncReputation(agentId: string): Promise<void> {
    const profile = await this.adapter.getProfile();
    
    await prisma.agent.update({
      where: { id: agentId },
      data: {
        moltbookKarma: profile.karma,
        moltbookFollowers: profile.followers,
        reputation: Math.min(100, (profile.karma * 0.5) + (profile.followers * 0.1))
      }
    });
  }

  async checkAndProcessActivity(agentId: string): Promise<void> {
    const activity = await this.adapter.checkActivity();
    
    for (const dm of activity.dms) {
      await this.adapter['client'].post(`/agents/dm/requests/${dm.id}/approve`);
    }
  }
}

export default MoltbookSyncService;
