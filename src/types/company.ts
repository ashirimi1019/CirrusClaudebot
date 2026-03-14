/** Company-related types */

export interface CompanyInput {
  domain: string;
  name?: string | null;
  size_min?: number | null;
  size_max?: number | null;
  funding_stage?: string | null;
  funding_amount?: number | null;
  country?: string;
  linkedin_url?: string | null;
  tech_stack_summary?: string | null;
  hiring_signal_summary?: string | null;
  company_segment?: string | null;
  fit_score?: number | null;
  source?: string | null;
  raw_data_json?: Record<string, unknown> | null;
}

export interface IcpScore {
  company_id: string;
  total: number;
  hiring_signal: number;
  company_size: number;
  funding: number;
  revenue_score: number;
  tech_keywords: number;
  qualifies: boolean;
}

export type CompanySegment = 'startup' | 'smb' | 'mid_market' | 'enterprise' | 'unknown';
