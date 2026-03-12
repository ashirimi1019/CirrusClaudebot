-- ============================================================================
-- 004_dedup_constraints.sql
-- Adds database-level protections against duplicate contacts and variants.
-- Safe to re-run (all operations use IF NOT EXISTS / DO $$ blocks).
-- ============================================================================

-- 1. Partial unique index on apollo_contact_id (only when NOT NULL)
--    Prevents two contacts from sharing the same Apollo ID.
CREATE UNIQUE INDEX IF NOT EXISTS idx_contacts_apollo_contact_id_unique
  ON contacts (apollo_contact_id)
  WHERE apollo_contact_id IS NOT NULL;

-- 2. Partial unique index on linkedin_url (only when NOT NULL and not empty)
--    Prevents duplicate contacts with same LinkedIn profile.
CREATE UNIQUE INDEX IF NOT EXISTS idx_contacts_linkedin_url_unique
  ON contacts (linkedin_url)
  WHERE linkedin_url IS NOT NULL AND linkedin_url != '';

-- 3. Composite index for name+company fallback matching.
--    Enables fast lookups for the name-based dedup cascade.
CREATE INDEX IF NOT EXISTS idx_contacts_name_company
  ON contacts (lower(first_name), lower(last_name), company_id);

-- 4. Unique constraint on message_variants to prevent duplicate inserts on re-run.
--    Same campaign + same variant_name = same variant (safe to upsert).
CREATE UNIQUE INDEX IF NOT EXISTS idx_message_variants_campaign_variant
  ON message_variants (campaign_id, variant_name)
  WHERE variant_name IS NOT NULL;

-- 5. Unique constraint on outreach_intelligence to prevent duplicate rows on re-run.
CREATE UNIQUE INDEX IF NOT EXISTS idx_outreach_intelligence_campaign_company
  ON outreach_intelligence (campaign_id, company_id)
  WHERE campaign_id IS NOT NULL AND company_id IS NOT NULL;

-- 6. Add segment_key + intelligence columns to campaign_contacts if missing.
--    (These may already exist from migration 003 — DO NOTHING if so.)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'campaign_contacts' AND column_name = 'segment_key'
  ) THEN
    ALTER TABLE campaign_contacts ADD COLUMN segment_key text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'campaign_contacts' AND column_name = 'buyer_persona_angle'
  ) THEN
    ALTER TABLE campaign_contacts ADD COLUMN buyer_persona_angle text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'campaign_contacts' AND column_name = 'contact_rationale'
  ) THEN
    ALTER TABLE campaign_contacts ADD COLUMN contact_rationale text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'campaign_contacts' AND column_name = 'intelligence_confidence'
  ) THEN
    ALTER TABLE campaign_contacts ADD COLUMN intelligence_confidence real;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'campaign_contacts' AND column_name = 'needs_review'
  ) THEN
    ALTER TABLE campaign_contacts ADD COLUMN needs_review boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'campaign_contacts' AND column_name = 'apollo_contact_id'
  ) THEN
    ALTER TABLE campaign_contacts ADD COLUMN apollo_contact_id text;
  END IF;
END $$;
