-- ============================================================================
-- CirrusLabs - Hiring Signal Outbound Engine
-- Supabase Database Schema
-- ============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- ENUMS
-- ============================================================================

CREATE TYPE evidence_type AS ENUM ('job_post', 'tech_signal', 'funding', 'news');
CREATE TYPE draft_status AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE api_tool AS ENUM ('theirstack', 'parallel', 'leadmagic', 'openai', 'exa', 'perplexity');

-- ============================================================================
-- TABLES
-- ============================================================================

-- ---------------------------------------------------------------------------
-- offers — offer definitions and positioning
-- ---------------------------------------------------------------------------
CREATE TABLE offers (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug text UNIQUE NOT NULL,
  name text NOT NULL,
  positioning jsonb NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_offers_slug ON offers(slug);
CREATE INDEX idx_offers_created_at ON offers(created_at DESC);

-- ---------------------------------------------------------------------------
-- campaigns — campaign strategies tied to offers
-- ---------------------------------------------------------------------------
CREATE TABLE campaigns (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  offer_id uuid NOT NULL REFERENCES offers(id) ON DELETE CASCADE,
  slug text NOT NULL,
  name text,
  strategy jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(offer_id, slug)
);

CREATE INDEX idx_campaigns_offer_id ON campaigns(offer_id);
CREATE INDEX idx_campaigns_created_at ON campaigns(created_at DESC);

-- ---------------------------------------------------------------------------
-- companies — discovered companies with hiring signals
-- ---------------------------------------------------------------------------
CREATE TABLE companies (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  domain text UNIQUE NOT NULL,
  name text,
  size_min integer,
  size_max integer,
  funding_stage text,
  country text DEFAULT 'US',
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_companies_domain ON companies(domain);
CREATE INDEX idx_companies_country ON companies(country);
CREATE INDEX idx_companies_created_at ON companies(created_at DESC);

-- ---------------------------------------------------------------------------
-- evidence — hiring signals and other company evidence
-- Linked to companies table
-- ---------------------------------------------------------------------------
CREATE TABLE evidence (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  type evidence_type NOT NULL,
  title text,
  raw_json jsonb,
  source text,
  posted_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_evidence_company_id ON evidence(company_id);
CREATE INDEX idx_evidence_type ON evidence(type);
CREATE INDEX idx_evidence_source ON evidence(source);
CREATE INDEX idx_evidence_posted_at ON evidence(posted_at DESC);
CREATE INDEX idx_evidence_created_at ON evidence(created_at DESC);

-- ---------------------------------------------------------------------------
-- buyers — decision makers (CTO, VP Eng, Founder, etc)
-- Linked to companies table
-- ---------------------------------------------------------------------------
CREATE TABLE buyers (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  first_name text,
  last_name text,
  title text,
  email text UNIQUE,
  linkedin_url text,
  enriched_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_buyers_company_id ON buyers(company_id);
CREATE INDEX idx_buyers_email ON buyers(email);
CREATE INDEX idx_buyers_title ON buyers(title);
CREATE INDEX idx_buyers_created_at ON buyers(created_at DESC);

-- ---------------------------------------------------------------------------
-- campaign_copy — email and LinkedIn copy variants
-- ---------------------------------------------------------------------------
CREATE TABLE campaign_copy (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id uuid NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  variant_name text NOT NULL,
  channel text NOT NULL,
  subject text,
  body text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_campaign_copy_campaign_id ON campaign_copy(campaign_id);
CREATE INDEX idx_campaign_copy_channel ON campaign_copy(channel);

-- ---------------------------------------------------------------------------
-- campaign_contacts — tracks which contacts are in which campaigns
-- ---------------------------------------------------------------------------
CREATE TABLE campaign_contacts (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id uuid NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  buyer_id uuid NOT NULL REFERENCES buyers(id) ON DELETE CASCADE,
  status text DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  UNIQUE(campaign_id, buyer_id)
);

CREATE INDEX idx_campaign_contacts_campaign_id ON campaign_contacts(campaign_id);
CREATE INDEX idx_campaign_contacts_buyer_id ON campaign_contacts(buyer_id);

-- ---------------------------------------------------------------------------
-- drafts — outreach email drafts (pending approval before sending)
-- Linked to buyers and evidence
-- ---------------------------------------------------------------------------
CREATE TABLE drafts (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  buyer_id uuid NOT NULL REFERENCES buyers(id) ON DELETE CASCADE,
  evidence_id uuid REFERENCES evidence(id) ON DELETE SET NULL,
  subject text,
  body text,
  status draft_status DEFAULT 'pending',
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_drafts_buyer_id ON drafts(buyer_id);
CREATE INDEX idx_drafts_evidence_id ON drafts(evidence_id);
CREATE INDEX idx_drafts_status ON drafts(status);
CREATE INDEX idx_drafts_created_at ON drafts(created_at DESC);

-- ---------------------------------------------------------------------------
-- api_logs — track all API calls for cost and debugging
-- ---------------------------------------------------------------------------
CREATE TABLE api_logs (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  tool api_tool NOT NULL,
  endpoint text,
  request_payload jsonb,
  response_summary jsonb,
  latency_ms integer,
  status_code integer,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_api_logs_tool ON api_logs(tool);
CREATE INDEX idx_api_logs_status_code ON api_logs(status_code);
CREATE INDEX idx_api_logs_created_at ON api_logs(created_at DESC);

-- ---------------------------------------------------------------------------
-- campaign_metrics — aggregate campaign performance metrics
-- ---------------------------------------------------------------------------
CREATE TABLE campaign_metrics (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id uuid NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  emails_sent integer DEFAULT 0,
  emails_opened integer DEFAULT 0,
  replies_total integer DEFAULT 0,
  replies_positive integer DEFAULT 0,
  replies_negative integer DEFAULT 0,
  replies_objection integer DEFAULT 0,
  replies_referral integer DEFAULT 0,
  replies_ooo integer DEFAULT 0,
  bounces integer DEFAULT 0,
  meetings_booked integer DEFAULT 0,
  deals_closed integer DEFAULT 0,
  reply_rate numeric(5,2),
  bounce_rate numeric(5,2),
  open_rate numeric(5,2),
  measured_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_campaign_metrics_campaign_id ON campaign_metrics(campaign_id);
CREATE INDEX idx_campaign_metrics_measured_at ON campaign_metrics(measured_at DESC);
CREATE INDEX idx_campaign_metrics_created_at ON campaign_metrics(created_at DESC);

-- ---------------------------------------------------------------------------
-- email_variant_performance — track performance of each email variant
-- ---------------------------------------------------------------------------
CREATE TABLE email_variant_performance (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id uuid NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  variant_name text NOT NULL,
  emails_sent integer DEFAULT 0,
  replies integer DEFAULT 0,
  positive_replies integer DEFAULT 0,
  reply_rate numeric(5,2),
  status text DEFAULT 'active' CHECK (status IN ('active', 'paused', 'killed')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_email_variant_performance_campaign_id ON email_variant_performance(campaign_id);
CREATE INDEX idx_email_variant_performance_status ON email_variant_performance(status);
CREATE INDEX idx_email_variant_performance_updated_at ON email_variant_performance(updated_at DESC);

-- ---------------------------------------------------------------------------
-- reply_sentiment — classified replies from Instantly
-- ---------------------------------------------------------------------------
CREATE TABLE reply_sentiment (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id uuid NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  buyer_id uuid REFERENCES buyers(id) ON DELETE SET NULL,
  reply_content text NOT NULL,
  sentiment text NOT NULL CHECK (sentiment IN ('positive', 'negative', 'objection', 'referral', 'ooo', 'unknown')),
  confidence numeric(3,2),
  raw_classification jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_reply_sentiment_campaign_id ON reply_sentiment(campaign_id);
CREATE INDEX idx_reply_sentiment_buyer_id ON reply_sentiment(buyer_id);
CREATE INDEX idx_reply_sentiment_sentiment ON reply_sentiment(sentiment);
CREATE INDEX idx_reply_sentiment_created_at ON reply_sentiment(created_at DESC);

-- ---------------------------------------------------------------------------
-- objection_patterns — extracted objections across campaigns for learning
-- ---------------------------------------------------------------------------
CREATE TABLE objection_patterns (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id uuid REFERENCES campaigns(id) ON DELETE SET NULL,
  objection_text text NOT NULL,
  category text,
  frequency integer DEFAULT 1,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_objection_patterns_campaign_id ON objection_patterns(campaign_id);
CREATE INDEX idx_objection_patterns_created_at ON objection_patterns(created_at DESC);

-- ---------------------------------------------------------------------------
-- lead_quality_scores — ICP and signal strength scoring
-- ---------------------------------------------------------------------------
CREATE TABLE lead_quality_scores (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  buyer_id uuid NOT NULL REFERENCES buyers(id) ON DELETE CASCADE,
  campaign_id uuid REFERENCES campaigns(id) ON DELETE SET NULL,
  icp_score integer DEFAULT 0,
  signal_strength integer DEFAULT 0,
  title_match boolean DEFAULT false,
  company_size_match boolean DEFAULT false,
  notes text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_lead_quality_scores_buyer_id ON lead_quality_scores(buyer_id);
CREATE INDEX idx_lead_quality_scores_campaign_id ON lead_quality_scores(campaign_id);
CREATE INDEX idx_lead_quality_scores_icp_score ON lead_quality_scores(icp_score DESC);

-- ---------------------------------------------------------------------------
-- campaign_replies — raw replies from Instantly (before processing/classification)
-- ---------------------------------------------------------------------------
CREATE TABLE campaign_replies (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id uuid NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  instantly_reply_id text UNIQUE,
  from_email text,
  reply_content text,
  replied_at timestamptz,
  processed boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_campaign_replies_campaign_id ON campaign_replies(campaign_id);
CREATE INDEX idx_campaign_replies_processed ON campaign_replies(processed);
CREATE INDEX idx_campaign_replies_created_at ON campaign_replies(created_at DESC);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) — Optional for production
-- ============================================================================
-- Uncomment and configure RLS policies as needed for production

-- ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE evidence ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE buyers ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE drafts ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE api_logs ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- HELPFUL QUERIES
-- ============================================================================

-- Count all records by table
-- SELECT
--   (SELECT count(*) FROM companies) as companies_count,
--   (SELECT count(*) FROM buyers) as buyers_count,
--   (SELECT count(*) FROM evidence) as evidence_count,
--   (SELECT count(*) FROM drafts) as drafts_count,
--   (SELECT count(*) FROM api_logs) as api_logs_count;

-- List recent companies with hiring signals
-- SELECT c.id, c.domain, c.name, count(e.id) as signal_count
-- FROM companies c
-- LEFT JOIN evidence e ON c.id = e.company_id
-- GROUP BY c.id, c.domain, c.name
-- ORDER BY c.created_at DESC
-- LIMIT 20;

-- List pending drafts with buyer and company info
-- SELECT d.id, d.subject, b.first_name, b.last_name, b.email, c.name, c.domain
-- FROM drafts d
-- JOIN buyers b ON d.buyer_id = b.id
-- JOIN companies c ON b.company_id = c.id
-- WHERE d.status = 'pending'
-- ORDER BY d.created_at DESC;

-- API cost summary by tool
-- SELECT tool, count(*) as call_count,
--   ROUND(AVG(latency_ms)::numeric, 2) as avg_latency_ms
-- FROM api_logs
-- WHERE created_at > NOW() - INTERVAL '30 days'
-- GROUP BY tool
-- ORDER BY call_count DESC;
