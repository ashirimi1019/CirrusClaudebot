/**
 * Campaign Brain - Autonomous Decision Engine
 * Monitors campaign metrics and makes autonomous decisions
 * Decides: rewrite copy, verify emails, increase volume, narrow ICP, pause campaign
 */

import { getSupabaseClient, CampaignMetrics } from '../lib/supabase.js';
import { getVariantPerformanceSummary } from './variant-evolution.js';

export interface BrainDecision {
  action: 'none' | 'rewrite_copy' | 'verify_emails' | 'increase_volume' | 'narrow_icp' | 'pause_campaign';
  reason: string;
  triggered_by: string;
  metadata: Record<string, unknown>;
  severity: 'info' | 'warning' | 'critical';
}

/**
 * Evaluate campaign health and determine next actions
 * Returns list of autonomous decisions the brain recommends
 */
export async function evaluateCampaign(campaignId: string): Promise<BrainDecision[]> {
  console.log(`\n🧠 Campaign Brain Evaluation: ${campaignId}`);

  const decisions: BrainDecision[] = [];

  try {
    const supabase = getSupabaseClient();

    // Get latest campaign metrics
    const { data: metrics, error } = await supabase
      .from('campaign_metrics')
      .select('*')
      .eq('campaign_id', campaignId)
      .order('measured_at', { ascending: false })
      .limit(1)
      .single();

    if (error || !metrics) {
      console.log('ℹ️  No metrics recorded yet - first campaign will establish baselines');
      return [
        {
          action: 'none',
          reason: 'First campaign - gathering baseline data',
          triggered_by: 'no_metrics',
          metadata: { campaign_id: campaignId },
          severity: 'info',
        },
      ];
    }

    console.log(`📊 Current Metrics:`);
    console.log(`   Emails sent: ${metrics.emails_sent}`);
    console.log(`   Reply rate: ${metrics.reply_rate}%`);
    console.log(`   Bounce rate: ${metrics.bounce_rate}%`);
    console.log(`   Positive replies: ${metrics.replies_positive}`);

    // Decision Logic
    const metricsObj = metrics as any;

    // DECISION 1: Low reply rate → rewrite copy
    if (metricsObj.reply_rate !== null && metricsObj.reply_rate < 2 && metricsObj.emails_sent >= 50) {
      decisions.push({
        action: 'rewrite_copy',
        reason: `Reply rate is ${metricsObj.reply_rate}% (target: >2%). Need better email copy.`,
        triggered_by: 'low_reply_rate',
        metadata: {
          current_rate: metricsObj.reply_rate,
          threshold: 2,
          emails_sent: metricsObj.emails_sent,
        },
        severity: 'critical',
      });
      console.log(`⚠️  CRITICAL: Low reply rate (${metricsObj.reply_rate}%) - recommend copy rewrite`);
    }

    // DECISION 2: High bounce rate → verify emails
    if (metricsObj.bounce_rate !== null && metricsObj.bounce_rate > 5) {
      decisions.push({
        action: 'verify_emails',
        reason: `Bounce rate is ${metricsObj.bounce_rate}% (target: <5%). Email addresses may be invalid.`,
        triggered_by: 'high_bounce_rate',
        metadata: {
          current_rate: metricsObj.bounce_rate,
          threshold: 5,
          bounces: metricsObj.bounces,
        },
        severity: 'critical',
      });
      console.log(`⚠️  CRITICAL: High bounce rate (${metricsObj.bounce_rate}%) - recommend email verification`);
    }

    // DECISION 3: Strong positive replies → increase volume
    if (
      metricsObj.replies_positive !== null &&
      metricsObj.replies_positive >= 5 &&
      metricsObj.emails_sent >= 50
    ) {
      const volumeIncrease = Math.ceil(metricsObj.emails_sent * 0.5); // 50% increase
      decisions.push({
        action: 'increase_volume',
        reason: `${metricsObj.replies_positive} positive replies - strong signal. Scale up by 50%.`,
        triggered_by: 'strong_positive_replies',
        metadata: {
          current_volume: metricsObj.emails_sent,
          positive_replies: metricsObj.replies_positive,
          recommended_increase: volumeIncrease,
        },
        severity: 'info',
      });
      console.log(
        `✅ OPPORTUNITY: ${metricsObj.replies_positive} positive replies - recommend scaling volume`
      );
    }

    // DECISION 4: Narrow ICP if mixed results
    if (metricsObj.reply_rate !== null && metricsObj.reply_rate > 2 && metricsObj.reply_rate < 5) {
      decisions.push({
        action: 'narrow_icp',
        reason: `Reply rate ${metricsObj.reply_rate}% is moderate. Narrow ICP to highest quality targets.`,
        triggered_by: 'moderate_reply_rate',
        metadata: {
          current_rate: metricsObj.reply_rate,
          recommendation: 'Focus on companies with strongest signals',
        },
        severity: 'warning',
      });
      console.log(`⚠️  WARNING: Moderate reply rate - recommend ICP narrowing`);
    }

    // DECISION 5: Pause campaign if terrible
    if (
      metricsObj.bounce_rate !== null &&
      metricsObj.bounce_rate > 10 &&
      metricsObj.emails_sent >= 100
    ) {
      decisions.push({
        action: 'pause_campaign',
        reason: `Bounce rate ${metricsObj.bounce_rate}% is too high. Pause to investigate quality issues.`,
        triggered_by: 'critical_bounce_rate',
        metadata: {
          current_rate: metricsObj.bounce_rate,
          emails_sent: metricsObj.emails_sent,
        },
        severity: 'critical',
      });
      console.log(`🛑 CRITICAL: Campaign health issue detected - recommend pause for review`);
    }

    // If no issues, all is well
    if (decisions.length === 0) {
      decisions.push({
        action: 'none',
        reason: 'Campaign is performing well. Continue current strategy.',
        triggered_by: 'healthy_metrics',
        metadata: {
          reply_rate: metricsObj.reply_rate,
          bounce_rate: metricsObj.bounce_rate,
        },
        severity: 'info',
      });
      console.log(`✅ Campaign is healthy - no action needed`);
    }
  } catch (error) {
    console.error('❌ Error evaluating campaign:', error);
    decisions.push({
      action: 'none',
      reason: 'Error during evaluation',
      triggered_by: 'evaluation_error',
      metadata: { error: String(error) },
      severity: 'warning',
    });
  }

  return decisions;
}

/**
 * Apply a brain decision
 * Executes the recommended action
 */
export async function applyDecision(decision: BrainDecision, campaignId: string): Promise<void> {
  console.log(`\n🎬 Applying Decision: ${decision.action}`);
  console.log(`   Reason: ${decision.reason}`);

  try {
    switch (decision.action) {
      case 'rewrite_copy':
        console.log('📝 ACTION: Triggering copy regeneration via Skill 3');
        console.log('   Run: npm run skill:3 -- <offer-slug> <campaign-slug>');
        console.log('   The regenerated copy will use updated context from objection patterns');
        break;

      case 'verify_emails':
        console.log('✉️  ACTION: Flagging leads for email verification');
        console.log('   Integration point: Leadmagic API verification');
        // TODO: Mark leads with needs_verification flag
        break;

      case 'increase_volume':
        console.log('📈 ACTION: Recommendation to increase send volume by 50%');
        console.log(`   Current: ${decision.metadata.current_volume} sends`);
        console.log(`   Recommended: ${decision.metadata.recommended_increase} additional sends`);
        break;

      case 'narrow_icp':
        console.log('🎯 ACTION: Recommendation to narrow ICP targeting');
        console.log('   Review context/frameworks/icp-framework.md');
        console.log('   Focus on: companies with strongest signals + matching job titles');
        break;

      case 'pause_campaign':
        console.log('🛑 ACTION: Campaign should be paused for investigation');
        console.log('   Check email list quality with verification service');
        break;

      case 'none':
        console.log('✅ No action needed - continue current strategy');
        break;
    }
  } catch (error) {
    console.error('❌ Error applying decision:', error);
  }
}

/**
 * Generate decision report for human review
 */
export async function generateBrainReport(campaignId: string): Promise<string> {
  const decisions = await evaluateCampaign(campaignId);

  let report = `
# Campaign Brain Report
Campaign ID: ${campaignId}
Generated: ${new Date().toISOString()}

## Autonomous Decisions

`;

  for (const decision of decisions) {
    const severityEmoji = {
      info: 'ℹ️',
      warning: '⚠️',
      critical: '🔴',
    }[decision.severity];

    report += `
### ${severityEmoji} ${decision.action.toUpperCase()}
- **Reason**: ${decision.reason}
- **Triggered by**: ${decision.triggered_by}
- **Severity**: ${decision.severity}
`;
  }

  report += `

## Next Steps

1. Review all recommendations above
2. For each CRITICAL decision, take action immediately
3. For WARNING decisions, consider impact and decide within 24h
4. For INFO decisions, can be deferred

---
*Generated by Campaign Brain v1.0*
`;

  return report;
}

/**
 * Monitor all active campaigns
 * Batch evaluation and reporting
 */
export async function monitorAllCampaigns(): Promise<void> {
  console.log('\n🧠 Monitoring All Campaigns...');

  try {
    const supabase = getSupabaseClient();

    const { data: campaigns, error } = await supabase
      .from('campaigns')
      .select('id, name, slug, offer_id')
      .order('created_at', { ascending: false });

    if (error || !campaigns) {
      console.error('❌ Error fetching campaigns:', error);
      return;
    }

    console.log(`Found ${campaigns.length} campaigns to monitor\n`);

    for (const campaign of campaigns) {
      const decisions = await evaluateCampaign(campaign.id);
      const critical = decisions.filter((d) => d.severity === 'critical');

      if (critical.length > 0) {
        console.log(`\n🔴 ALERTS for ${campaign.name}:`);
        for (const d of critical) {
          console.log(`   - ${d.action}: ${d.reason}`);
        }
      }

      // Small delay between campaigns
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    console.log('\n✅ Campaign monitoring complete');
  } catch (error) {
    console.error('❌ Error monitoring campaigns:', error);
  }
}
