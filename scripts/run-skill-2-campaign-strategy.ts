import 'dotenv/config.js';
import { runSkill2CampaignStrategy } from '../src/core/skills/skill-2-campaign-strategy.ts';

runSkill2CampaignStrategy().catch((err: Error) => {
  console.error('❌ Skill 2 failed:', err.message);
  process.exit(1);
});
