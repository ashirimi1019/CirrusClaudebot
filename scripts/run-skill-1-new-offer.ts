/**
 * Skill 1 Entry Point: New Offer
 * Run: npm run skill:1
 */

import 'dotenv/config.js';
import { runSkill1NewOffer } from '../src/core/skills/skill-1-new-offer.ts';

runSkill1NewOffer().catch((err: Error) => {
  console.error('❌ Skill 1 failed:', err.message);
  process.exit(1);
});
