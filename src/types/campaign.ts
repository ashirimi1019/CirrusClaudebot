/** Campaign-related types */

export interface CampaignInput {
  offer_id: string;
  slug: string;
  name?: string;
  signal_hypothesis?: string;
  signal_type?: string;
  messaging_framework?: string;
  status?: CampaignStatus;
  strategy?: Record<string, unknown>;
  strategy_summary?: string;
}

export type CampaignStatus = 'draft' | 'active' | 'paused' | 'completed' | 'archived';

export type SignalType =
  | 'hiring_signal'
  | 'funding_signal'
  | 'tech_signal'
  | 'news_signal'
  | 'growth_signal';

export type MessagingFramework =
  | 'pain_agitate_solve'
  | 'before_after_bridge'
  | 'problem_solution'
  | 'case_study'
  | 'curiosity';

export interface CampaignStrategy {
  signal_hypothesis: string;
  signal_type: SignalType;
  target_roles: string[];
  target_geography: string[];
  employee_ranges: string[];
  messaging_framework: MessagingFramework;
  key_pain_points: string[];
  value_propositions: string[];
}
