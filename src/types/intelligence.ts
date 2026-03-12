/**
 * Intelligence Types
 * Types for the intelligent outreach engine: company classification,
 * contact-level buyer adaptation, segment grouping, and variant generation.
 */

// ─── Enums ──────────────────────────────────────────────────────────────────

export type OfferType = 'individual_placement' | 'pod_delivery';
export type ServiceLine = 'data_engineering' | 'ml_ai' | 'cloud_infrastructure' | 'software_development' | 'cyber_security';
export type SegmentKey = `${OfferType}:${ServiceLine}`;

// ─── Company Classification ─────────────────────────────────────────────────

export interface CompanyClassification {
  company_name: string;
  company_domain: string;
  offer_type: OfferType;
  service_line: ServiceLine;
  segment_key: SegmentKey;
  messaging_angle: string;
  rationale: string;
  confidence: number;        // 0.00 – 1.00
  needs_review?: boolean;    // true if confidence < 0.65
  fallback_applied?: boolean;
}

/** Input shape for OpenAI company classification batch */
export interface CompanyClassificationInput {
  company_name: string;
  domain: string;
  hiring_signal: string;
  fit_score?: string;
  employee_count?: number;
  industry?: string;
  funding_stage?: string;
  buyer_titles?: string[];
}

// ─── Contact-Level Messaging Adaptation ─────────────────────────────────────

export interface ContactMessagingAdaptation {
  company_domain: string;
  contact_email?: string;
  contact_name?: string;
  title: string;
  buyer_persona_angle: string;
  contact_rationale: string;
  intelligence_confidence: number;  // 0.00 – 1.00
  needs_review?: boolean;
}

// ─── Segments ───────────────────────────────────────────────────────────────

export interface SegmentGroup {
  segment_key: SegmentKey;
  offer_type: OfferType;
  service_line: ServiceLine;
  companies: string[];           // company domains in this segment
  contacts: LeadRow[];           // leads routed to this segment
  variants?: SegmentVariant[];   // populated after copy generation
  apollo_sequence_id?: string;   // populated after sequence creation
}

export interface SegmentVariant {
  segment_key: SegmentKey;
  variant_number: number;   // 1, 2, 3
  subject: string;
  body: string;
}

// ─── Lead Row (CSV-derived) ─────────────────────────────────────────────────

export interface LeadRow {
  company_name: string;
  company_domain: string;
  hiring_signal: string;
  fit_score: string;
  first_name: string;
  last_name: string;
  title: string;
  email: string;
  linkedin_url: string;

  // Enriched by intelligence layer
  segment_key?: SegmentKey;
  buyer_persona_angle?: string;
  contact_rationale?: string;
  intelligence_confidence?: number;
  needs_review?: boolean;
}

// ─── Config ─────────────────────────────────────────────────────────────────

export interface IntelligentOutreachConfig {
  apolloSequenceId?: string | null;  // backward compat: force single sequence
  autoCreateSequence?: boolean;
  skipIntelligence?: boolean;        // fallback to old static behavior
}

// ─── Constants ──────────────────────────────────────────────────────────────

export const LOW_CONFIDENCE_THRESHOLD = 0.65;
export const MIN_SEGMENT_SIZE = 3;

export const OFFER_TYPE_LABELS: Record<OfferType, string> = {
  individual_placement: 'Individual Placement',
  pod_delivery: 'Pod/Team Delivery',
};

export const SERVICE_LINE_LABELS: Record<ServiceLine, string> = {
  data_engineering: 'Data Engineering',
  ml_ai: 'ML / AI',
  cloud_infrastructure: 'Cloud Infrastructure',
  software_development: 'Software Development',
  cyber_security: 'Cyber Security',
};
