import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Enums
export type EvidenceType = 'job_post' | 'tech_signal' | 'funding' | 'news';
export type DraftStatus = 'pending' | 'approved' | 'rejected';
export type OutreachChannel = 'email' | 'linkedin' | 'phone';
export type SendStatus = 'pending' | 'sent' | 'failed' | 'skipped';

// ─── Core Tables ────────────────────────────────────────────────────────────

export interface Offer {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  category: string | null;
  target_market: string | null;
  positioning_summary: string | null;
  icp_summary: string | null;
  buyer_summary: string | null;
  positioning: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface Company {
  id: string;
  domain: string;
  name: string | null;
  linkedin_url: string | null;
  company_size: string | null;
  employee_count: number | null;
  funding_stage: string | null;
  funding_amount: number | null;
  industry: string | null;
  location: string | null;
  country: string;
  tech_stack_summary: string | null;
  hiring_signal_summary: string | null;
  company_segment: string | null;
  fit_score: number;
  disqualified: boolean;
  disqualify_reason: string | null;
  source: string | null;
  raw_data_json: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface Evidence {
  id: string;
  company_id: string;
  type: EvidenceType;
  title: string | null;
  raw_json: Record<string, unknown> | null;
  source: string | null;
  posted_at: string | null;
  created_at: string;
}

/** Renamed from Buyer — decision-makers (CTO, VP Eng, Founder, etc.) */
export interface Contact {
  id: string;
  company_id: string;
  first_name: string | null;
  last_name: string | null;
  full_name?: string | null; // generated column in DB
  title: string | null;
  seniority: string | null;
  department: string | null;
  email: string | null;
  email_status: string | null;
  phone: string | null;
  linkedin_url: string | null;
  apollo_contact_id: string | null;
  fit_score: number | null;
  enriched_at: string | null;
  created_at: string;
}

export interface Campaign {
  id: string;
  offer_id: string;
  slug: string;
  name: string | null;
  signal_hypothesis: string | null;
  signal_type: string | null;
  messaging_framework: string | null;
  status: string | null;
  strategy: Record<string, unknown> | null;
  strategy_summary: string | null;
  created_at: string;
  updated_at: string;
}

// ─── Join / Linking Tables ───────────────────────────────────────────────────

export interface CampaignCompany {
  id: string;
  campaign_id: string;
  company_id: string;
  signal_details: string | null;
  fit_score: number;
  included: boolean;
  exclusion_reason: string | null;
  segment_key: string | null;
  offer_type: string | null;
  service_line: string | null;
  buyer_persona_angle: string | null;
  contact_rationale: string | null;
  intelligence_confidence: number | null;
  needs_review: boolean | null;
  outreach_intelligence_id: string | null;
  created_at: string;
}

// ─── Messaging ───────────────────────────────────────────────────────────────

/** Renamed from campaign_copy */
export interface MessageVariant {
  id: string;
  campaign_id: string;
  channel: OutreachChannel;
  variant_name: string;
  subject_line: string | null;
  body: string | null;
  framework_used: string | null;
  segment_key: string | null;
  created_at: string;
}

export interface Message {
  id: string;
  campaign_id: string;
  contact_id: string | null;
  company_id: string | null;
  message_variant_id: string | null;
  channel: OutreachChannel;
  personalized_subject: string | null;
  personalized_body: string | null;
  apollo_sequence_id: string | null;
  send_status: SendStatus;
  sent_at: string | null;
  replied_at: string | null;
  reply_category: string | null;
  created_at: string;
  updated_at: string;
}

export interface Draft {
  id: string;
  contact_id: string;
  evidence_id: string | null;
  subject: string | null;
  body: string | null;
  status: DraftStatus;
  created_at: string;
}

// ─── Analytics ───────────────────────────────────────────────────────────────

export interface CampaignMetrics {
  id: string;
  campaign_id: string;
  total_companies: number;
  total_contacts: number;
  total_messages: number;
  total_replies: number;
  total_interested: number;
  total_meetings: number;
  total_warm_leads: number;
  total_buyers: number;
  reply_rate: number | null;
  interested_rate: number | null;
  meeting_rate: number | null;
  buyer_rate: number | null;
  emails_opened: number;
  bounces: number;
  deals_closed: number;
  open_rate: number | null;
  bounce_rate: number | null;
  updated_at: string;
  created_at: string;
}

/** Renamed from api_logs */
export interface ToolUsage {
  id: string;
  campaign_id: string | null;
  tool_name: string;
  action_name: string | null;
  units_used: number;
  estimated_cost: number | null;
  metadata_json: Record<string, unknown> | null;
  created_at: string;
}

export interface ReplySentiment {
  id: string;
  campaign_id: string;
  contact_id: string | null;
  reply_content: string;
  sentiment: 'positive' | 'negative' | 'objection' | 'referral' | 'ooo' | 'unknown';
  confidence: number | null;
  raw_classification: Record<string, unknown> | null;
  created_at: string;
}

// ─── Outreach Intelligence ───────────────────────────────────────────────────

export interface OutreachIntelligence {
  id: string;
  campaign_id: string;
  company_id: string | null;
  offer_type: string;
  service_line: string;
  segment_key: string;
  messaging_angle: string | null;
  rationale: string | null;
  confidence: number | null;
  needs_review: boolean | null;
  fallback_applied: boolean | null;
  raw_classification: Record<string, unknown> | null;
  created_at: string;
}

export interface GeneratedArtifact {
  id: string;
  user_id: string | null;
  campaign_id: string | null;
  skill_run_id: string | null;
  skill_id: string | null;
  artifact_name: string;
  artifact_type: string | null;
  file_path: string | null;
  segment_key: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

// ─── Supabase Client ──────────────────────────────────────────────────────────

let client: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient {
  if (client) return client;

  const url = process.env.SUPABASE_URL;
  // Prefer service role key for server-side operations; fall back to anon key
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error('Missing SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_ANON_KEY) in environment');
  }

  client = createClient(url, key);
  return client;
}
