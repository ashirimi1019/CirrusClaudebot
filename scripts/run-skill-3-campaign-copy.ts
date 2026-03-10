import 'dotenv/config.js';
import { runSkill3CampaignCopy } from '../src/core/skills/skill-3-campaign-copy.ts';

runSkill3CampaignCopy().catch((err: Error) => {
  console.error('❌ Skill 3 failed:', err.message);
  process.exit(1);
});
