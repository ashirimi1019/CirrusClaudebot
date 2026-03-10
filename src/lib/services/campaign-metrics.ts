/**
 * Campaign Metrics Service
 * Computes rates and summary statistics for campaigns
 */

import type { CampaignMetricsInput, ComputedRates, CampaignSummary } from '../../types/metrics.ts';

/**
 * Compute derived rates from raw campaign metric counts.
 */
export function computeRates(metrics: CampaignMetricsInput): ComputedRates {
  const sent = metrics.emails_sent || 0;
  const opened = metrics.emails_opened || 0;
  const replies = metrics.replies_total || 0;
  const bounces = metrics.bounces || 0;
  const positive = metrics.replies_positive || 0;
  const meetings = metrics.meetings_booked || 0;
  const deals = metrics.deals_closed || 0;

  const safe = (num: number, den: number) =>
    den > 0 ? Math.round((num / den) * 10000) / 100 : 0;

  return {
    reply_rate: safe(replies, sent),
    open_rate: safe(opened, sent),
    bounce_rate: safe(bounces, sent),
    interested_rate: safe(positive, sent),
    meeting_rate: safe(meetings, sent),
    buyer_rate: safe(deals, sent),
  };
}

/**
 * Determine if a campaign is performing well based on benchmarks.
 * Benchmarks: reply_rate > 3%, meeting_rate > 1%
 */
export function evaluatePerformance(rates: ComputedRates): {
  grade: 'A' | 'B' | 'C' | 'D';
  summary: string;
} {
  if (rates.reply_rate >= 5 && rates.meeting_rate >= 2) {
    return { grade: 'A', summary: 'Excellent — above all benchmarks' };
  } else if (rates.reply_rate >= 3 && rates.meeting_rate >= 1) {
    return { grade: 'B', summary: 'Good — meets benchmarks' };
  } else if (rates.reply_rate >= 1) {
    return { grade: 'C', summary: 'Below average — review copy and targeting' };
  } else {
    return { grade: 'D', summary: 'Poor — significant issues with targeting or deliverability' };
  }
}

/**
 * Generate a human-readable recommendation based on rates.
 */
export function generateRecommendation(rates: ComputedRates): string {
  if (rates.bounce_rate > 5) {
    return 'High bounce rate — verify email addresses before next send';
  }
  if (rates.reply_rate < 1) {
    return 'Very low reply rate — revise subject lines and value proposition';
  }
  if (rates.reply_rate >= 3 && rates.meeting_rate < 1) {
    return 'Good replies but low meetings — strengthen CTA and follow-up';
  }
  if (rates.reply_rate >= 3 && rates.meeting_rate >= 1) {
    return 'Campaign performing well — scale with more contacts';
  }
  return 'Run for at least 50 sends before drawing conclusions';
}
