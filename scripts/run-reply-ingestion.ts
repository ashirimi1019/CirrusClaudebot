/**
 * REPLY INGESTION - Pull Replies from Instantly & Classify
 * Fetches replies from Instantly, classifies sentiment, extracts objections
 */

import { ingestCampaignReplies, ingestAllCampaignReplies } from '../src/brain/reply-ingestion.js';

async function runReplyIngestion() {
  console.log('\n========================================');
  console.log('REPLY INGESTION - Sentiment Classification');
  console.log('========================================\n');

  const campaignId = process.argv[2];

  if (campaignId) {
    // Single campaign
    console.log(`📬 Ingesting Replies for Campaign: ${campaignId}\n`);
    const count = await ingestCampaignReplies(campaignId);
    console.log(`\n✅ Ingestion Complete: ${count} replies processed`);
  } else {
    // All campaigns
    console.log('📬 Ingesting Replies from All Campaigns\n');
    await ingestAllCampaignReplies();
  }

  console.log('\n✅ REPLY INGESTION COMPLETE\n');
}

await runReplyIngestion().catch((err) => {
  console.error('❌ Ingestion error:', err);
  process.exit(1);
});
