/**
 * CAMPAIGN BRAIN - Autonomous Decision Engine
 * Monitors campaigns and makes autonomous decisions
 */

import { evaluateCampaign, applyDecision, monitorAllCampaigns, generateBrainReport } from '../src/brain/campaign-brain.js';

async function runBrain() {
  console.log('\n========================================');
  console.log('CAMPAIGN BRAIN - Autonomous Decision Engine');
  console.log('========================================\n');

  const campaignId = process.argv[2];

  if (campaignId) {
    // Single campaign evaluation
    console.log(`🧠 Evaluating Campaign: ${campaignId}\n`);

    const decisions = await evaluateCampaign(campaignId);

    console.log(`\n📋 Decisions Made: ${decisions.length}`);
    for (const decision of decisions) {
      console.log(`\n  ${decision.action.toUpperCase()}`);
      console.log(`  └─ ${decision.reason}`);

      if (decision.severity === 'critical') {
        console.log(`\n  ▶️  Applying decision automatically...`);
        await applyDecision(decision, campaignId);
      }
    }

    // Generate report
    const report = await generateBrainReport(campaignId);
    console.log(report);
  } else {
    // Monitor all campaigns
    console.log('📊 Monitoring All Campaigns\n');
    await monitorAllCampaigns();
  }

  console.log('\n✅ BRAIN EVALUATION COMPLETE\n');
}

await runBrain().catch((err) => {
  console.error('❌ Brain error:', err);
  process.exit(1);
});
