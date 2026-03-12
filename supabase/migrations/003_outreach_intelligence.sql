-- Migration 003: Outreach Intelligence
-- Adds intelligent segmentation, company/contact classification, and artifact tracking.

-- ─── Enums ──────────────────────────────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE offer_type_enum AS ENUM ('individual_placement', 'pod_delivery');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE service_line_enum AS ENUM ('data_engineering', 'ml_ai', 'cloud_infrastructure', 'software_development', 'cyber_security');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ─── Core Company-Level Intelligence Table ──────────────────────────────────

CREATE TABLE IF NOT EXISTS outreach_intelligence (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id uuid REFERENCES campaigns(id),
  company_id uuid REFERENCES companies(id),
  offer_type offer_type_enum NOT NULL,
  service_line service_line_enum NOT NULL,
  segment_key text NOT NULL,
  messaging_angle text,
  rationale text,
  confidence numeric(3,2),
  needs_review boolean DEFAULT false,
  fallback_applied boolean DEFAULT false,
  raw_classification jsonb,
  created_at timestamptz DEFAULT now()
);

-- ─── Extend campaign_contacts for Contact-Level Intelligence ────────────────
-- (campaign_contacts may be named campaign_companies in some setups — both
--  columns are added idempotently so the migration is safe either way.)

-- If your schema uses a dedicated campaign_contacts table, these columns go there.
-- If contacts are tracked via campaign_companies, add them there instead.

-- We'll add to campaign_companies since that's what exists in the current schema.
-- The skill will store contact-level intelligence per campaign_companies row
-- or directly on the messages table.

ALTER TABLE campaign_companies
  ADD COLUMN IF NOT EXISTS segment_key text,
  ADD COLUMN IF NOT EXISTS offer_type offer_type_enum,
  ADD COLUMN IF NOT EXISTS service_line service_line_enum,
  ADD COLUMN IF NOT EXISTS buyer_persona_angle text,
  ADD COLUMN IF NOT EXISTS contact_rationale text,
  ADD COLUMN IF NOT EXISTS intelligence_confidence numeric(3,2),
  ADD COLUMN IF NOT EXISTS needs_review boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS outreach_intelligence_id uuid REFERENCES outreach_intelligence(id);

-- ─── Extend Existing Tables ─────────────────────────────────────────────────

ALTER TABLE message_variants ADD COLUMN IF NOT EXISTS segment_key text;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS segment_key text;
-- apollo_sequence_id may already exist on messages from prior work
ALTER TABLE messages ADD COLUMN IF NOT EXISTS apollo_sequence_id text;

-- ─── Artifact Tracking Table ────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS generated_artifacts (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid,
  campaign_id uuid REFERENCES campaigns(id),
  skill_run_id uuid,
  skill_id text,
  artifact_name text NOT NULL,
  artifact_type text,
  file_path text,
  segment_key text,
  metadata jsonb,
  created_at timestamptz DEFAULT now()
);

-- ─── Indexes ────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_outreach_intelligence_campaign ON outreach_intelligence(campaign_id);
CREATE INDEX IF NOT EXISTS idx_outreach_intelligence_company ON outreach_intelligence(company_id);
CREATE INDEX IF NOT EXISTS idx_outreach_intelligence_segment ON outreach_intelligence(segment_key);
CREATE INDEX IF NOT EXISTS idx_campaign_companies_segment ON campaign_companies(segment_key);
CREATE INDEX IF NOT EXISTS idx_generated_artifacts_campaign ON generated_artifacts(campaign_id);
