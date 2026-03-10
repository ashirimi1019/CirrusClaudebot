/**
 * Multi-Strategy Variant Evolution
 * Tracks variant performance, kills underperformers, generates winners
 * Automates A/B testing lifecycle
 */

import { getSupabaseClient, EmailVariantPerformance } from '../lib/supabase.js';
import { generateDraft } from '../lib/clients/openai.js';

interface VariantRanking {
  variant_name: string;
  reply_rate: number;
  emails_sent: number;
  replies: number;
  status: string;
  rank: number;
}

/**
 * Update variant performance metrics from campaign replies
 * Queries reply_sentiment table to count replies per variant
 */
export async function updateVariantPerformance(campaignId: string): Promise<void> {
  console.log(`\n📊 Updating Variant Performance for Campaign: ${campaignId}`);

  try {
    const supabase = getSupabaseClient();

    // Get all variants for this campaign
    const { data: variants, error: variantError } = await supabase
      .from('email_variant_performance')
      .select('id, variant_name, campaign_id')
      .eq('campaign_id', campaignId);

    if (variantError || !variants) {
      console.error('❌ Error fetching variants:', variantError);
      return;
    }

    // For each variant, count sent emails and replies
    for (const variant of variants) {
      // Count emails sent (from campaign_contacts table if we're tracking variant assignment)
      // For now, this is a placeholder - actual implementation needs campaign_contacts to track variants
      const emailsSent = 5; // TODO: query actual sent count from email logs

      // Count positive replies (sentiment classification)
      const { data: replies, error: replyError } = await supabase
        .from('reply_sentiment')
        .select('id, sentiment')
        .eq('campaign_id', campaignId)
        .in('sentiment', ['positive', 'objection', 'referral']); // Count as "replies"

      if (replyError || !replies) {
        console.warn(`⚠️  Error fetching replies for ${variant.variant_name}`);
        continue;
      }

      const totalReplies = replies.length;
      const positiveReplies = replies.filter((r) => r.sentiment === 'positive').length;
      const replyRate = emailsSent > 0 ? ((totalReplies / emailsSent) * 100).toFixed(2) : '0';

      // Update variant performance
      const { error: updateError } = await supabase
        .from('email_variant_performance')
        .update({
          emails_sent: emailsSent,
          replies: totalReplies,
          positive_replies: positiveReplies,
          reply_rate: parseFloat(replyRate as string),
          updated_at: new Date().toISOString(),
        })
        .eq('id', variant.id);

      if (updateError) {
        console.warn(`⚠️  Error updating ${variant.variant_name}:`, updateError);
      } else {
        console.log(`   ${variant.variant_name}: ${totalReplies} replies from ${emailsSent} sends (${replyRate}%)`);
      }
    }

    console.log('✅ Variant performance updated');
  } catch (error) {
    console.error('❌ Error updating variant performance:', error);
  }
}

/**
 * Get all variants ranked by reply rate
 * Used by campaign brain to understand variant performance
 */
export async function getVariantRanking(campaignId: string): Promise<VariantRanking[]> {
  try {
    const supabase = getSupabaseClient();

    const { data: variants, error } = await supabase
      .from('email_variant_performance')
      .select('variant_name, reply_rate, emails_sent, replies, status')
      .eq('campaign_id', campaignId)
      .eq('status', 'active')
      .order('reply_rate', { ascending: false, nullsFirst: false });

    if (error || !variants) {
      console.warn('⚠️  Error fetching variant ranking:', error);
      return [];
    }

    return variants.map((v, index) => ({
      variant_name: v.variant_name,
      reply_rate: v.reply_rate || 0,
      emails_sent: v.emails_sent || 0,
      replies: v.replies || 0,
      status: v.status,
      rank: index + 1,
    }));
  } catch (error) {
    console.error('❌ Error getting variant ranking:', error);
    return [];
  }
}

/**
 * Evolve variants: kill underperformers, generate new winners
 * Applies 30% rule: if best variant is 30% better, kill worst
 */
export async function evolveVariants(campaignId: string): Promise<void> {
  console.log(`\n🧬 Evolving Variants for Campaign: ${campaignId}`);

  try {
    const supabase = getSupabaseClient();

    // Get variant ranking
    const ranking = await getVariantRanking(campaignId);
    if (ranking.length < 2) {
      console.log('ℹ️  Need at least 2 variants to compare - skipping evolution');
      return;
    }

    const best = ranking[0];
    const worst = ranking[ranking.length - 1];

    // Check if best is significantly better (30% rule)
    const threshold = worst.reply_rate * 1.3;
    if (best.reply_rate < threshold) {
      console.log(`ℹ️  Best variant (${best.reply_rate}%) not 30% better than worst (${worst.reply_rate}%)`);
      return;
    }

    console.log(`🎯 Evolution Triggered:`);
    console.log(`   Winner: ${best.variant_name} (${best.reply_rate}% reply rate)`);
    console.log(`   Loser: ${worst.variant_name} (${worst.reply_rate}% reply rate)`);

    // Kill the worst variant
    const { error: killError } = await supabase
      .from('email_variant_performance')
      .update({ status: 'killed', updated_at: new Date().toISOString() })
      .eq('variant_name', worst.variant_name)
      .eq('campaign_id', campaignId);

    if (killError) {
      console.error('❌ Error killing variant:', killError);
      return;
    }
    console.log(`   ✅ Killed underperforming variant: ${worst.variant_name}`);

    // Generate new variant based on winner style
    // TODO: This would call generateDraft with instructions to match winning style
    // For now, log recommendation
    console.log(`   📝 Recommendation: Generate new variant based on winning style of "${best.variant_name}"`);
    console.log(`      Use: buildDynamicContext + variant evolution prompt to OpenAI`);
  } catch (error) {
    console.error('❌ Error evolving variants:', error);
  }
}

/**
 * Get performance summary for a campaign
 * Shows which variants are performing and which are struggling
 */
export async function getVariantPerformanceSummary(campaignId: string): Promise<void> {
  try {
    const supabase = getSupabaseClient();

    const ranking = await getVariantRanking(campaignId);
    if (ranking.length === 0) {
      console.log('ℹ️  No variants found for campaign');
      return;
    }

    console.log(`\n📊 Variant Performance Summary:`);
    for (const v of ranking) {
      const status = v.status === 'active' ? '✅' : '❌';
      console.log(
        `   ${status} ${v.variant_name}: ${v.replies}/${v.emails_sent} replies (${v.reply_rate.toFixed(1)}%)`
      );
    }
  } catch (error) {
    console.error('❌ Error getting performance summary:', error);
  }
}

/**
 * Archive old/dead variants
 * Clean up variants that haven't been used or performed poorly
 */
export async function archiveOldVariants(campaignId: string, daysOld = 30): Promise<number> {
  try {
    const supabase = getSupabaseClient();
    const threshold = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000).toISOString();

    const { data: oldVariants, error: fetchError } = await supabase
      .from('email_variant_performance')
      .select('id, variant_name')
      .eq('campaign_id', campaignId)
      .lt('updated_at', threshold)
      .eq('status', 'active');

    if (fetchError || !oldVariants) {
      console.warn('⚠️  Error fetching old variants:', fetchError);
      return 0;
    }

    if (oldVariants.length === 0) {
      return 0;
    }

    // Archive (pause) old variants
    const { error: archiveError } = await supabase
      .from('email_variant_performance')
      .update({ status: 'paused', updated_at: new Date().toISOString() })
      .lt('updated_at', threshold)
      .eq('campaign_id', campaignId)
      .eq('status', 'active');

    if (archiveError) {
      console.warn('⚠️  Error archiving variants:', archiveError);
      return 0;
    }

    console.log(`✅ Archived ${oldVariants.length} old variants (not updated in ${daysOld} days)`);
    return oldVariants.length;
  } catch (error) {
    console.error('❌ Error archiving old variants:', error);
    return 0;
  }
}
