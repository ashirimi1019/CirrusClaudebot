import 'dotenv/config.js';
import { runSkill6CampaignReview } from '../src/core/skills/skill-6-campaign-review.ts';

runSkill6CampaignReview().catch((err: Error) => {
  console.error('❌ Skill 6 failed:', err.message);
  process.exit(1);
});
