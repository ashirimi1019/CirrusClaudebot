/** Contact-related types (decision-makers: CTO, VP Eng, Founder, etc.) */

export interface ContactInput {
  company_id: string;
  first_name?: string | null;
  last_name?: string | null;
  title?: string | null;
  seniority?: string | null;
  department?: string | null;
  email?: string | null;
  email_status?: string | null;
  phone?: string | null;
  linkedin_url?: string | null;
  apollo_contact_id?: string | null;
  fit_score?: number | null;
  enriched_at?: string | null;
}

export type Seniority =
  | 'c_suite'
  | 'vp'
  | 'director'
  | 'manager'
  | 'senior'
  | 'mid'
  | 'entry'
  | 'unknown';

export type EmailStatus =
  | 'verified'
  | 'likely_to_engage'
  | 'unverified'
  | 'unavailable'
  | 'bounced';
