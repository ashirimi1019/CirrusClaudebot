-- ============================================================================
-- 001_initial_schema.sql
-- Apollo-Only AI Outbound GTM System — Cirrus
-- Complete initial schema
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- ENUMS
-- ============================================================================

CREATE TYPE evidence_type    AS ENUM ('job_post', 'tech_signal', 'funding', 'news');
CREATE TYPE draft_status     AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE outreach_channel AS ENUM ('email', 'linkedin', 'phone');
CREATE TYPE send_status      AS ENUM ('pending', 'sent', 'failed', 'skipped');

-- ============================================================================
-- offers
-- Offer definitions, positioning, ICP metadata
-- ============================================================================
CREATE TABLE offers (
  id                  uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug                text UNIQUE NOT NULL,
  name                text NOT NULL,
  description         text,
  category            text,                 -- 'staffing' | 'consulting' | 'taas'
  target_market       text,                 -- 'US' | 'LATAM' | 'US+LATAM'
  positioning_summary text,
  icp_summary         text,
  buyer_summary       text,
  positioning         jsonb NOT NULL DEFAULT '{}',
  created_at          timestamptz DEFAULT now(),
  updated_at          timestamptz DEFAULT now()
);

CREATE INDEX idx_offers_slug       ON offers(slug);
CREATE INDEX idx_offers_category   ON offers(category);
CREATE INDEX idx_offers_created_at ON offers(created_at DESC);

-- ============================================================================
-- companies
-- Discovered companies, enrichment, fit scoring
-- ============================================================================
CREATE TABLE companies (
  id                    uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name                  text,
  domain                text UNIQUE NOT NULL,
  linkedin_url          text,
  company_size          text,               -- '1-10' | '11-50' | etc.
  employee_count        integer,
  funding_stage         text,
  funding_amount        bigint,
  industry              text,
  location              text,
  country               text DEFAULT 'US',
  tech_stack_summary    text,
  hiring_signal_summary text,
  company_segment       text,               -- 'startup' | 'smb' | 'enterprise'
  fit_score             integer DEFAULT 0,
  disqualified          boolean DEFAULT false,
  disqualify_reason     text,
  source                text DEFAULT 'apollo',
  raw_data_json         jsonb,
  created_at            timestamptz DEFAULT now(),
  updated_at            timestamptz DEFAULT now()
);

CREATE INDEX idx_companies_domain      ON companies(domain);
CREATE INDEX idx_companies_country     ON companies(country);
CREATE INDEX idx_companies_fit_score   ON companies(fit_score DESC);
CREATE INDEX idx_companies_disqualified ON companies(disqualified);
CREATE INDEX idx_companies_created_at  ON companies(created_at DESC);

-- ============================================================================
-- contacts
-- Target buyers (was: buyers)
-- ============================================================================
CREATE TABLE contacts (
  id                uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id        uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  first_name        text,
  last_name         text,
  full_name         text GENERATED ALWAYS AS (
                      TRIM(COALESCE(first_name || ' ' || last_name,
                                    first_name,
                                    last_name, ''))
                    ) STORED,
  title             text,
  seniority         text,                   -- 'c_suite' | 'vp' | 'director' | 'manager' | 'ic'
  department        text,                   -- 'engineering' | 'data' | 'product' | etc.
  email             text UNIQUE,
  email_status      text,                   -- 'verified' | 'likely_to_engage' | 'unverified' | 'unavailable'
  phone             text,
  linkedin_url      text,
  apollo_contact_id text,
  fit_score         integer DEFAULT 0,
  enriched_at       timestamptz,
  created_at        timestamptz DEFAULT now(),
  updated_at        timestamptz DEFAULT now()
);

CREATE INDEX idx_contacts_company_id        ON contacts(company_id);
CREATE INDEX idx_contacts_email             ON contacts(email);
CREATE INDEX idx_contacts_title             ON contacts(title);
CREATE INDEX idx_contacts_apollo_contact_id ON contacts(apollo_contact_id);
CREATE INDEX idx_contacts_fit_score         ON contacts(fit_score DESC);
CREATE INDEX idx_contacts_created_at        ON contacts(created_at DESC);

-- ============================================================================
-- evidence
-- Hiring signals and other company evidence
-- ============================================================================
CREATE TABLE evidence (
  id         uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  type       evidence_type NOT NULL,
  title      text,
  raw_json   jsonb,
  source     text,
  posted_at  timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_evidence_company_id ON evidence(company_id);
CREATE INDEX idx_evidence_type       ON evidence(type);
CREATE INDEX idx_evidence_source     ON evidence(source);
CREATE INDEX idx_evidence_posted_at  ON evidence(posted_at DESC);
CREATE INDEX idx_evidence_created_at ON evidence(created_at DESC);

-- ============================================================================
-- campaigns
-- Campaign definitions per offer
-- ============================================================================
CREATE TABLE campaigns (
  id                uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  offer_id          uuid NOT NULL REFERENCES offers(id) ON DELETE CASCADE,
  slug              text NOT NULL,
  name              text,
  signal_hypothesis text,
  signal_type       text,                   -- 'hiring' | 'funding' | 'expansion' | etc.
  messaging_framework text,                 -- 'pain' | 'signal' | 'pod'
  status            text DEFAULT 'draft',   -- 'draft' | 'active' | 'paused' | 'complete'
  strategy_summary  text,
  strategy          jsonb,                  -- full strategy blob from Skill 2
  created_at        timestamptz DEFAULT now(),
  updated_at        timestamptz DEFAULT now(),
  UNIQUE(offer_id, slug)
);

CREATE INDEX idx_campaigns_offer_id   ON campaigns(offer_id);
CREATE INDEX idx_campaigns_status     ON campaigns(status);
CREATE INDEX idx_campaigns_created_at ON campaigns(created_at DESC);

-- ============================================================================
-- campaign_companies
-- Maps companies to campaigns with signal context
-- ============================================================================
CREATE TABLE campaign_companies (
  id               uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id      uuid NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  company_id       uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  signal_details   text,
  fit_score        integer DEFAULT 0,
  included         boolean DEFAULT true,
  exclusion_reason text,
  created_at       timestamptz DEFAULT now(),
  UNIQUE(campaign_id, company_id)
);

CREATE INDEX idx_campaign_companies_campaign_id ON campaign_companies(campaign_id);
CREATE INDEX idx_campaign_companies_company_id  ON campaign_companies(company_id);
CREATE INDEX idx_campaign_companies_included    ON campaign_companies(included);

-- ============================================================================
-- campaign_contacts
-- Maps contacts to campaigns with outreach tracking
-- ============================================================================
CREATE TABLE campaign_contacts (
  id                    uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id           uuid NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  contact_id            uuid NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  company_id            uuid REFERENCES companies(id) ON DELETE SET NULL,
  persona_match_score   integer DEFAULT 0,
  outreach_status       text DEFAULT 'pending',  -- 'pending' | 'sent' | 'replied' | 'meeting' | 'closed' | 'excluded'
  sequence_step         integer DEFAULT 0,
  last_contacted_at     timestamptz,
  created_at            timestamptz DEFAULT now(),
  updated_at            timestamptz DEFAULT now(),
  UNIQUE(campaign_id, contact_id)
);

CREATE INDEX idx_campaign_contacts_campaign_id      ON campaign_contacts(campaign_id);
CREATE INDEX idx_campaign_contacts_contact_id       ON campaign_contacts(contact_id);
CREATE INDEX idx_campaign_contacts_outreach_status  ON campaign_contacts(outreach_status);

-- ============================================================================
-- message_variants
-- Generated copy variants for A/B testing (was: campaign_copy)
-- ============================================================================
CREATE TABLE message_variants (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id     uuid NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  channel         outreach_channel NOT NULL DEFAULT 'email',
  variant_name    text NOT NULL,
  subject_line    text,
  body            text,
  framework_used  text,
  created_at      timestamptz DEFAULT now()
);

CREATE INDEX idx_message_variants_campaign_id ON message_variants(campaign_id);
CREATE INDEX idx_message_variants_channel     ON message_variants(channel);

-- ============================================================================
-- messages
-- Individual personalized message records + outcome tracking
-- ============================================================================
CREATE TABLE messages (
  id                   uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id          uuid NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  contact_id           uuid REFERENCES contacts(id) ON DELETE SET NULL,
  company_id           uuid REFERENCES companies(id) ON DELETE SET NULL,
  message_variant_id   uuid REFERENCES message_variants(id) ON DELETE SET NULL,
  channel              outreach_channel NOT NULL DEFAULT 'email',
  personalized_subject text,
  personalized_body    text,
  apollo_sequence_id   text,
  send_status          send_status DEFAULT 'pending',
  sent_at              timestamptz,
  replied_at           timestamptz,
  reply_category       text,               -- 'positive' | 'negative' | 'objection' | 'ooo' | 'referral'
  created_at           timestamptz DEFAULT now(),
  updated_at           timestamptz DEFAULT now()
);

CREATE INDEX idx_messages_campaign_id        ON messages(campaign_id);
CREATE INDEX idx_messages_contact_id         ON messages(contact_id);
CREATE INDEX idx_messages_send_status        ON messages(send_status);
CREATE INDEX idx_messages_replied_at         ON messages(replied_at DESC);
CREATE INDEX idx_messages_created_at         ON messages(created_at DESC);

-- ============================================================================
-- campaign_metrics
-- Funnel performance per campaign
-- ============================================================================
CREATE TABLE campaign_metrics (
  id               uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id      uuid NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  total_companies  integer DEFAULT 0,
  total_contacts   integer DEFAULT 0,
  total_messages   integer DEFAULT 0,
  total_replies    integer DEFAULT 0,
  total_interested integer DEFAULT 0,
  total_meetings   integer DEFAULT 0,
  total_warm_leads integer DEFAULT 0,
  total_buyers     integer DEFAULT 0,
  reply_rate       numeric(5,2),
  interested_rate  numeric(5,2),
  meeting_rate     numeric(5,2),
  buyer_rate       numeric(5,2),
  -- Supplemental detail fields
  emails_opened    integer DEFAULT 0,
  bounces          integer DEFAULT 0,
  deals_closed     integer DEFAULT 0,
  open_rate        numeric(5,2),
  bounce_rate      numeric(5,2),
  updated_at       timestamptz DEFAULT now(),
  created_at       timestamptz DEFAULT now()
);

CREATE INDEX idx_campaign_metrics_campaign_id ON campaign_metrics(campaign_id);
CREATE INDEX idx_campaign_metrics_updated_at  ON campaign_metrics(updated_at DESC);

-- ============================================================================
-- tool_usage
-- API usage and cost tracking (was: api_logs)
-- ============================================================================
CREATE TABLE tool_usage (
  id             uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id    uuid REFERENCES campaigns(id) ON DELETE SET NULL,
  tool_name      text NOT NULL,             -- 'apollo' | 'openai' | 'supabase'
  action_name    text,                      -- 'company_search' | 'people_search' | 'generate_copy'
  units_used     integer DEFAULT 0,
  estimated_cost numeric(10,4) DEFAULT 0,
  metadata_json  jsonb,
  created_at     timestamptz DEFAULT now()
);

CREATE INDEX idx_tool_usage_campaign_id ON tool_usage(campaign_id);
CREATE INDEX idx_tool_usage_tool_name   ON tool_usage(tool_name);
CREATE INDEX idx_tool_usage_created_at  ON tool_usage(created_at DESC);

-- ============================================================================
-- drafts
-- Email drafts pending human approval before sending
-- ============================================================================
CREATE TABLE drafts (
  id          uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  contact_id  uuid NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  evidence_id uuid REFERENCES evidence(id) ON DELETE SET NULL,
  campaign_id uuid REFERENCES campaigns(id) ON DELETE SET NULL,
  subject     text,
  body        text,
  status      draft_status DEFAULT 'pending',
  created_at  timestamptz DEFAULT now()
);

CREATE INDEX idx_drafts_contact_id  ON drafts(contact_id);
CREATE INDEX idx_drafts_evidence_id ON drafts(evidence_id);
CREATE INDEX idx_drafts_status      ON drafts(status);
CREATE INDEX idx_drafts_created_at  ON drafts(created_at DESC);

-- ============================================================================
-- email_variant_performance
-- A/B test results per variant
-- ============================================================================
CREATE TABLE email_variant_performance (
  id               uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id      uuid NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  variant_name     text NOT NULL,
  emails_sent      integer DEFAULT 0,
  replies          integer DEFAULT 0,
  positive_replies integer DEFAULT 0,
  reply_rate       numeric(5,2),
  status           text DEFAULT 'active' CHECK (status IN ('active', 'paused', 'killed')),
  created_at       timestamptz DEFAULT now(),
  updated_at       timestamptz DEFAULT now()
);

CREATE INDEX idx_evp_campaign_id ON email_variant_performance(campaign_id);
CREATE INDEX idx_evp_status      ON email_variant_performance(status);

-- ============================================================================
-- reply_sentiment
-- Classified replies
-- ============================================================================
CREATE TABLE reply_sentiment (
  id                  uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id         uuid NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  contact_id          uuid REFERENCES contacts(id) ON DELETE SET NULL,
  reply_content       text NOT NULL,
  sentiment           text NOT NULL CHECK (sentiment IN ('positive','negative','objection','referral','ooo','unknown')),
  confidence          numeric(3,2),
  raw_classification  jsonb,
  created_at          timestamptz DEFAULT now()
);

CREATE INDEX idx_reply_sentiment_campaign_id ON reply_sentiment(campaign_id);
CREATE INDEX idx_reply_sentiment_contact_id  ON reply_sentiment(contact_id);
CREATE INDEX idx_reply_sentiment_sentiment   ON reply_sentiment(sentiment);

-- ============================================================================
-- objection_patterns
-- Extracted objections for learning
-- ============================================================================
CREATE TABLE objection_patterns (
  id             uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id    uuid REFERENCES campaigns(id) ON DELETE SET NULL,
  objection_text text NOT NULL,
  category       text,
  frequency      integer DEFAULT 1,
  created_at     timestamptz DEFAULT now(),
  updated_at     timestamptz DEFAULT now()
);

CREATE INDEX idx_objection_patterns_campaign_id ON objection_patterns(campaign_id);

-- ============================================================================
-- ROW LEVEL SECURITY (optional for production)
-- Uncomment when deploying to production with auth
-- ============================================================================
-- ALTER TABLE companies  ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE contacts   ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE evidence   ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE drafts     ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE tool_usage ENABLE ROW LEVEL SECURITY;
