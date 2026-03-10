/**
 * MASTER PIPELINE RUNNER
 * Runs Skills 1-5 in sequence using campaign.config.json
 *
 * Usage:
 *   npm run pipeline                             ← uses campaign.config.json in project root
 *   npm run pipeline -- path/to/my-config.json  ← custom config path
 *
 * Skips skills whose output already exists when `pipeline.skipIfExists: true`
 */

import 'dotenv/config.js';
import fs from 'fs';
import path from 'path';

import { runSkill1NewOffer } from '../src/core/skills/skill-1-new-offer.ts';
import { runSkill2CampaignStrategy } from '../src/core/skills/skill-2-campaign-strategy.ts';
import { runSkill3CampaignCopy } from '../src/core/skills/skill-3-campaign-copy.ts';
import { runSkill4FindLeads } from '../src/core/skills/skill-4-find-leads.ts';
import { runSkill5LaunchOutreach } from '../src/core/skills/skill-5-launch-outreach.ts';

function toSlug(text: string): string {
  return text.toLowerCase().replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '-').substring(0, 100);
}

async function main() {
  console.log('\n╔════════════════════════════════════════╗');
  console.log('║    CIRRUSLABS OUTBOUND PIPELINE        ║');
  console.log('╚════════════════════════════════════════╝\n');

  // ─── Load config ───
  const configPath = process.argv[2] || path.join(process.cwd(), 'campaign.config.json');
  if (!fs.existsSync(configPath)) {
    console.error(`❌ Config file not found: ${configPath}`);
    console.error('  Create campaign.config.json or pass a path: npm run pipeline -- my-config.json');
    process.exit(1);
  }

  const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  const { offer, campaign, pipeline = {} } = config;
  const skipIfExists: boolean = pipeline.skipIfExists ?? true;

  const offerSlug = toSlug(offer.name);
  const campaignSlug = toSlug(campaign.name);

  console.log(`📋 Config: ${path.basename(configPath)}`);
  console.log(`  Offer:    ${offerSlug}`);
  console.log(`  Campaign: ${campaignSlug}`);
  console.log(`  Skip if exists: ${skipIfExists}\n`);

  const startTime = Date.now();
  const results: { skill: string; status: 'done' | 'skipped' | 'failed'; detail?: string }[] = [];

  // ─── SKILL 1: New Offer ───
  const positioningPath = path.join(process.cwd(), 'offers', offerSlug, 'positioning.md');
  if (skipIfExists && fs.existsSync(positioningPath)) {
    console.log('⏭️  Skill 1: SKIPPED (positioning.md exists)\n');
    results.push({ skill: 'Skill 1 (New Offer)', status: 'skipped' });
  } else {
    try {
      await runSkill1NewOffer(offer);
      results.push({ skill: 'Skill 1 (New Offer)', status: 'done' });
    } catch (err: any) {
      console.error(`❌ Skill 1 failed: ${err.message}`);
      results.push({ skill: 'Skill 1 (New Offer)', status: 'failed', detail: err.message });
      process.exit(1);
    }
  }

  // ─── SKILL 2: Campaign Strategy ───
  const strategyPath = path.join(process.cwd(), 'offers', offerSlug, 'campaigns', campaignSlug, 'strategy.md');
  if (skipIfExists && fs.existsSync(strategyPath)) {
    console.log('⏭️  Skill 2: SKIPPED (strategy.md exists)\n');
    results.push({ skill: 'Skill 2 (Campaign Strategy)', status: 'skipped' });
  } else {
    try {
      await runSkill2CampaignStrategy(offerSlug, campaign);
      results.push({ skill: 'Skill 2 (Campaign Strategy)', status: 'done' });
    } catch (err: any) {
      console.error(`❌ Skill 2 failed: ${err.message}`);
      results.push({ skill: 'Skill 2 (Campaign Strategy)', status: 'failed', detail: err.message });
      process.exit(1);
    }
  }

  // ─── SKILL 3: Campaign Copy (reads slugs from process.argv) ───
  const copyDir = path.join(process.cwd(), 'offers', offerSlug, 'campaigns', campaignSlug, 'copy');
  const copyExists = fs.existsSync(copyDir) && fs.readdirSync(copyDir).some((f) => f.startsWith('email-'));
  if (skipIfExists && copyExists) {
    console.log('⏭️  Skill 3: SKIPPED (email copy variants exist)\n');
    results.push({ skill: 'Skill 3 (Campaign Copy)', status: 'skipped' });
  } else {
    try {
      process.argv[2] = offerSlug;
      process.argv[3] = campaignSlug;
      await runSkill3CampaignCopy();
      results.push({ skill: 'Skill 3 (Campaign Copy)', status: 'done' });
    } catch (err: any) {
      console.error(`❌ Skill 3 failed: ${err.message}`);
      results.push({ skill: 'Skill 3 (Campaign Copy)', status: 'failed', detail: err.message });
      process.exit(1);
    }
  }

  // ─── SKILL 4: Find Leads (reads slugs from process.argv) ───
  const leadsPath = path.join(process.cwd(), 'offers', offerSlug, 'campaigns', campaignSlug, 'leads', 'all_leads.csv');
  if (skipIfExists && fs.existsSync(leadsPath)) {
    console.log('⏭️  Skill 4: SKIPPED (all_leads.csv exists)\n');
    results.push({ skill: 'Skill 4 (Find Leads)', status: 'skipped' });
  } else {
    try {
      process.argv[2] = offerSlug;
      process.argv[3] = campaignSlug;
      await runSkill4FindLeads();
      results.push({ skill: 'Skill 4 (Find Leads)', status: 'done' });
    } catch (err: any) {
      console.error(`❌ Skill 4 failed: ${err.message}`);
      results.push({ skill: 'Skill 4 (Find Leads)', status: 'failed', detail: err.message });
      process.exit(1);
    }
  }

  // ─── SKILL 5: Launch Outreach ───
  try {
    await runSkill5LaunchOutreach(offerSlug, campaignSlug, {
      apolloSequenceId: pipeline.apolloSequenceId || null,
      autoCreateSequence: pipeline.autoCreateSequence ?? true,
    });
    results.push({ skill: 'Skill 5 (Launch Outreach)', status: 'done' });
  } catch (err: any) {
    console.error(`❌ Skill 5 failed: ${err.message}`);
    results.push({ skill: 'Skill 5 (Launch Outreach)', status: 'failed', detail: err.message });
    process.exit(1);
  }

  // ─── Final Summary ───
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  const statusIcon = { done: '✅', skipped: '⏭️ ', failed: '❌' };

  console.log('\n╔════════════════════════════════════════╗');
  console.log('║    PIPELINE COMPLETE                   ║');
  console.log('╚════════════════════════════════════════╝');
  console.log(`\n  Offer:    ${offerSlug}`);
  console.log(`  Campaign: ${campaignSlug}`);
  console.log(`  Elapsed:  ${elapsed}s\n`);
  console.log('  Results:');
  for (const r of results) {
    console.log(`    ${statusIcon[r.status]} ${r.skill}`);
    if (r.detail) console.log(`        ↳ ${r.detail}`);
  }
  console.log('\n💡 Apollo is now sending the sequence automatically.');
  console.log('   Wait 7-14 days, then review results:');
  console.log(`   npm run skill:6 -- ${offerSlug} ${campaignSlug}`);
}

main().catch((err) => {
  console.error('\n❌ Pipeline crashed:', err.message || err);
  process.exit(1);
});
