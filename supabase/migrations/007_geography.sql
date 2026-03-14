-- Migration 007: Geography configuration on offers and campaigns
-- Adds allowed_countries (jsonb array) and allowed_us_states (jsonb array)
-- to offers and campaigns tables.
--
-- Resolution order mirrors vertical inheritance:
--   campaign.allowed_countries ?? offer.allowed_countries ?? system default
--   campaign.allowed_us_states ?? offer.allowed_us_states ?? null (all states)
--
-- null = inherit from parent (offer) or use system default
-- empty array [] is NOT used (null is the sentinel for "not configured")

-- Offers: store the default geography config for all campaigns under this offer
ALTER TABLE offers
  ADD COLUMN IF NOT EXISTS allowed_countries  jsonb DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS allowed_us_states  jsonb DEFAULT NULL;

-- Campaigns: optional override of the offer-level geography config
ALTER TABLE campaigns
  ADD COLUMN IF NOT EXISTS allowed_countries  jsonb DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS allowed_us_states  jsonb DEFAULT NULL;

-- Comments for documentation
COMMENT ON COLUMN offers.allowed_countries IS
  'Array of allowed country names (e.g. ["United States","Canada"]). null = use system default.';

COMMENT ON COLUMN offers.allowed_us_states IS
  'Array of allowed US state names. null = all US states allowed. Only applies when United States is in allowed_countries.';

COMMENT ON COLUMN campaigns.allowed_countries IS
  'Optional override of offer.allowed_countries. null = inherit from offer.';

COMMENT ON COLUMN campaigns.allowed_us_states IS
  'Optional override of offer.allowed_us_states. null = inherit from offer.';
