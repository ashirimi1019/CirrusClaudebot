import 'dotenv/config.js';
import { runSkill5LaunchOutreach } from '../src/core/skills/skill-5-launch-outreach.ts';

runSkill5LaunchOutreach().catch((err: Error) => {
  console.error('❌ Skill 5 failed:', err.message);
  process.exit(1);
});
