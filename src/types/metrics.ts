/** Campaign metrics and analytics types */

export interface CampaignMetricsInput {
  campaign_id: string;
  emails_sent?: number;
  emails_opened?: number;
  replies_total?: number;
  replies_positive?: number;
  replies_negative?: number;
  replies_objection?: number;
  replies_referral?: number;
  replies_ooo?: number;
  bounces?: number;
  meetings_booked?: number;
  deals_closed?: number;
}

export interface ComputedRates {
  reply_rate: number;
  open_rate: number;
  bounce_rate: number;
  interested_rate: number;
  meeting_rate: number;
  buyer_rate: number;
}

export interface CampaignSummary {
  campaign_id: string;
  campaign_name: string;
  emails_sent: number;
  reply_rate: number;
  meeting_rate: number;
  top_variant: string | null;
  top_objection: string | null;
  recommendation: string;
}

export type ReplySentimentType =
  | 'positive'
  | 'negative'
  | 'objection'
  | 'referral'
  | 'ooo'
  | 'unknown';
