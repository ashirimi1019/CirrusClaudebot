import 'dotenv/config.js';
import { runSkill4FindLeads } from '../src/core/skills/skill-4-find-leads.ts';

runSkill4FindLeads().catch((err: Error) => {
  console.error('❌ Skill 4 failed:', err.message);
  process.exit(1);
});
