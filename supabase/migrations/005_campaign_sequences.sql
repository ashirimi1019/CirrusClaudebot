-- ============================================================================
-- 005_campaign_sequences.sql
-- Tracks Apollo sequence ownership per campaign+segment to prevent duplicates.
-- Safe to re-run (all operations use IF NOT EXISTS / DO $$ blocks).
-- ============================================================================

-- 1. Create campaign_sequences table
CREATE TABLE IF NOT EXISTS campaign_sequences (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id   uuid NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  segment_key   text,                            -- NULL for static (single-sequence) mode
  apollo_sequence_id   text NOT NULL,            -- Apollo's sequence ID
  sequence_name        text NOT NULL,            -- Human-readable name used in Apollo
  status               text NOT NULL DEFAULT 'active',  -- active, paused, completed, archived
  is_primary           boolean NOT NULL DEFAULT true,
  contacts_enrolled    integer NOT NULL DEFAULT 0,
  steps_count          integer NOT NULL DEFAULT 0,
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now()
);

-- 2. Unique constraint: one sequence per campaign+segment
--    Uses COALESCE to handle NULL segment_key (static mode = '__static__')
CREATE UNIQUE INDEX IF NOT EXISTS idx_campaign_sequences_campaign_segment
  ON campaign_sequences (campaign_id, COALESCE(segment_key, '__static__'));

-- 3. Unique constraint on apollo_sequence_id (no two rows should point to same Apollo sequence)
CREATE UNIQUE INDEX IF NOT EXISTS idx_campaign_sequences_apollo_id
  ON campaign_sequences (apollo_sequence_id)
  WHERE apollo_sequence_id IS NOT NULL;

-- 4. Index for quick lookups by campaign
CREATE INDEX IF NOT EXISTS idx_campaign_sequences_campaign_id
  ON campaign_sequences (campaign_id);

-- 5. RPC function for upsert (handles COALESCE-based unique index)
CREATE OR REPLACE FUNCTION upsert_campaign_sequence(
  p_campaign_id uuid,
  p_segment_key text,
  p_apollo_sequence_id text,
  p_sequence_name text,
  p_steps_count integer DEFAULT 0,
  p_contacts_enrolled integer DEFAULT 0
) RETURNS void AS $$
BEGIN
  INSERT INTO campaign_sequences (campaign_id, segment_key, apollo_sequence_id, sequence_name, steps_count, contacts_enrolled, status, updated_at)
  VALUES (p_campaign_id, p_segment_key, p_apollo_sequence_id, p_sequence_name, p_steps_count, p_contacts_enrolled, 'active', now())
  ON CONFLICT (campaign_id, COALESCE(segment_key, '__static__'))
  DO UPDATE SET
    apollo_sequence_id = EXCLUDED.apollo_sequence_id,
    sequence_name = EXCLUDED.sequence_name,
    steps_count = EXCLUDED.steps_count,
    contacts_enrolled = EXCLUDED.contacts_enrolled,
    status = 'active',
    updated_at = now();
END;
$$ LANGUAGE plpgsql;

-- 6. Backfill from generated_artifacts if possible
--    (extracts apollo_sequence_id from metadata JSON for existing Skill 5 runs)
DO $$
BEGIN
  -- Only backfill if campaign_sequences is empty and generated_artifacts has data
  IF NOT EXISTS (SELECT 1 FROM campaign_sequences LIMIT 1) THEN
    INSERT INTO campaign_sequences (campaign_id, segment_key, apollo_sequence_id, sequence_name, status)
    SELECT
      ga.campaign_id,
      seg->>'segment_key' AS segment_key,
      seg->>'apollo_sequence_id' AS apollo_sequence_id,
      'CirrusLabs - backfill - ' || (seg->>'segment_key') AS sequence_name,
      'active' AS status
    FROM generated_artifacts ga,
         jsonb_array_elements(ga.metadata->'segments') AS seg
    WHERE ga.skill_id = 'skill-5'
      AND ga.metadata->'segments' IS NOT NULL
      AND seg->>'apollo_sequence_id' IS NOT NULL
      AND seg->>'apollo_sequence_id' != ''
    ON CONFLICT DO NOTHING;
  END IF;
END $$;
