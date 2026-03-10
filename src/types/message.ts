/** Message and variant types */

import type { OutreachChannel, SendStatus } from '../lib/supabase.ts';

export interface MessageVariantInput {
  campaign_id: string;
  variant_name: string;
  channel: OutreachChannel;
  subject?: string | null;
  body?: string | null;
  personalization_notes?: string | null;
}

export interface MessageInput {
  campaign_id: string;
  contact_id: string;
  variant_id?: string | null;
  channel: OutreachChannel;
  subject?: string | null;
  body?: string | null;
  personalized_body?: string | null;
  status?: SendStatus;
  apollo_sequence_id?: string | null;
  apollo_contact_id?: string | null;
}

export interface PersonalizationContext {
  company_name: string;
  contact_first_name: string;
  contact_title: string;
  hiring_signal: string;
  sender_name: string;
}

export interface EmailVariant {
  variant_name: string;
  subject: string;
  body: string;
}

export interface LinkedInVariant {
  variant_name: string;
  message: string;
}
