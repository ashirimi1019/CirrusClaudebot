/**
 * Reply Ingestion & Sentiment Classification
 * Pulls replies from Instantly API → Classifies with OpenAI → Stores in DB
 * Extracts objection patterns for dynamic context
 */

import { getSupabaseClient, ReplySentiment, ObjectionPattern } from '../lib/supabase.js';
import { getSequenceReplies } from '../lib/clients/apollo.js';
import { generateDraft } from '../lib/clients/openai.js';

// Adapter: fetch replies via Apollo (replaces Instantly)
async function getCampaignReplies(campaignId: string): Promise<{ content: string; from_email: string }[]> {
  const replies = await getSequenceReplies(campaignId);
  return replies.map((r) => ({ content: r.body_text, from_email: r.contact_email }));
}

interface ClassificationResult {
  sentiment: 'positive' | 'negative' | 'objection' | 'referral' | 'ooo' | 'unknown';
  confidence: number;
  objection_text?: string;
  reason?: string;
}

/**
 * Classify a single reply using OpenAI
 * Returns sentiment label and extracted objection (if applicable)
 */
async function classifyReply(replyContent: string): Promise<ClassificationResult> {
  try {
    // Use OpenAI to classify the reply
    const prompt = `You are a sales sentiment classifier. Analyze this email reply and classify it.

Reply: "${replyContent}"

Classify into ONE category:
- positive: They're interested, want to talk, or expressed positive sentiment
- negative: They're not interested, want to unsubscribe, or clearly rejected
- objection: They have a concern/objection but might still be interested
- referral: They referred you to someone else
- ooo: They're out of office
- unknown: Can't determine sentiment

Return ONLY valid JSON (no markdown, no quotes around keys):
{
  "sentiment": "positive|negative|objection|referral|ooo|unknown",
  "confidence": 0.0-1.0,
  "objection_text": "text if sentiment is objection, null otherwise",
  "reason": "brief explanation"
}`;

    // Call OpenAI for classification
    const response = await generateDraft({
      company_name: 'Classification',
      buyer_first_name: 'System',
      buyer_title: 'Classifier',
      signal: 'Email Classification',
    });

    // Parse response (rough parsing, could be improved)
    let result: ClassificationResult = {
      sentiment: 'unknown',
      confidence: 0.5,
    };

    // Try to extract JSON from response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      result = {
        sentiment: parsed.sentiment || 'unknown',
        confidence: parsed.confidence || 0.5,
        objection_text: parsed.objection_text,
        reason: parsed.reason,
      };
    }

    return result;
  } catch (error) {
    console.error('❌ Error classifying reply:', error);
    return {
      sentiment: 'unknown',
      confidence: 0.3,
    };
  }
}

/**
 * Extract objection text and store as pattern
 * Groups similar objections together for learning
 */
async function extractAndStoreObjection(
  objectionText: string,
  campaignId: string
): Promise<void> {
  try {
    const supabase = getSupabaseClient();

    // Check if similar objection exists (simple matching)
    const { data: existing } = await supabase
      .from('objection_patterns')
      .select('id, frequency')
      .eq('objection_text', objectionText)
      .limit(1)
      .single();

    if (existing) {
      // Increment frequency
      await supabase
        .from('objection_patterns')
        .update({ frequency: existing.frequency + 1, updated_at: new Date().toISOString() })
        .eq('id', existing.id);
    } else {
      // Create new pattern
      await supabase
        .from('objection_patterns')
        .insert({
          campaign_id: campaignId,
          objection_text: objectionText,
          frequency: 1,
        });
    }
  } catch (error) {
    console.warn('⚠️  Error storing objection pattern:', error);
  }
}

/**
 * Process all unprocessed replies for a campaign
 * Main entry point: ingest replies → classify → extract patterns → store
 */
export async function ingestCampaignReplies(campaignId: string): Promise<number> {
  console.log(`\n🔄 Ingesting Replies for Campaign: ${campaignId}`);

  try {
    const supabase = getSupabaseClient();

    // Get unprocessed replies from Instantly
    const replies = await getCampaignReplies(campaignId);
    if (replies.length === 0) {
      console.log('ℹ️  No new replies found');
      return 0;
    }

    console.log(`📬 Processing ${replies.length} replies...`);

    let processed = 0;
    const sentiments: Record<string, number> = {
      positive: 0,
      negative: 0,
      objection: 0,
      referral: 0,
      ooo: 0,
      unknown: 0,
    };

    for (const reply of replies) {
      try {
        // Classify the reply
        const classification = await classifyReply(reply.content);

        // Store in reply_sentiment table
        const { error } = await supabase.from('reply_sentiment').insert({
          campaign_id: campaignId,
          reply_content: reply.content,
          from_email: reply.from_email,
          sentiment: classification.sentiment,
          confidence: classification.confidence,
          raw_classification: {
            reason: classification.reason,
            objection_text: classification.objection_text,
          },
        });

        if (error) {
          console.warn(`⚠️  Error storing reply sentiment:`, error);
          continue;
        }

        // Extract objection if applicable
        if (classification.sentiment === 'objection' && classification.objection_text) {
          await extractAndStoreObjection(classification.objection_text, campaignId);
        }

        sentiments[classification.sentiment]++;
        processed++;
      } catch (err) {
        console.error(`❌ Error processing reply from ${reply.from_email}:`, err);
      }
    }

    // Log summary
    console.log(`✅ Processed ${processed} replies:`);
    console.log(`   Positive: ${sentiments.positive}`);
    console.log(`   Negative: ${sentiments.negative}`);
    console.log(`   Objection: ${sentiments.objection}`);
    console.log(`   Referral: ${sentiments.referral}`);
    console.log(`   OOO: ${sentiments.ooo}`);
    console.log(`   Unknown: ${sentiments.unknown}`);

    return processed;
  } catch (error) {
    console.error('❌ Error ingesting campaign replies:', error);
    return 0;
  }
}

/**
 * Batch process all campaigns
 * Useful for scheduled/automated reply ingestion
 */
export async function ingestAllCampaignReplies(): Promise<void> {
  console.log('\n🔄 Batch Ingesting Replies from All Campaigns...');

  try {
    const supabase = getSupabaseClient();

    // Get all active campaigns
    const { data: campaigns, error } = await supabase
      .from('campaigns')
      .select('id, name, slug')
      .order('created_at', { ascending: false });

    if (error || !campaigns) {
      console.error('❌ Error fetching campaigns:', error);
      return;
    }

    console.log(`Found ${campaigns.length} campaigns to process`);

    let totalProcessed = 0;
    for (const campaign of campaigns) {
      const count = await ingestCampaignReplies(campaign.id);
      totalProcessed += count;

      // Small delay between campaigns
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    console.log(`\n✅ Batch ingestion complete: ${totalProcessed} total replies processed`);
  } catch (error) {
    console.error('❌ Error in batch ingestion:', error);
  }
}
