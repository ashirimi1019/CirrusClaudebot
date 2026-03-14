-- 006_verticals.sql
-- Vertical architecture: verticals table + FK columns on offers and campaigns

-- Verticals table
CREATE TABLE IF NOT EXISTS verticals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed the 3 initial verticals
INSERT INTO verticals (slug, name, description) VALUES
  ('staffing', 'Staffing', 'Contract and contract-to-hire technical talent placement'),
  ('ai-data-consulting', 'AI & Data Consulting', 'AI/ML strategy, data platform modernization, analytics consulting'),
  ('cloud-software-delivery', 'Cloud & Software Delivery', 'Cloud migration, platform engineering, software delivery acceleration')
ON CONFLICT (slug) DO NOTHING;

-- Add vertical FK columns to offers and campaigns
ALTER TABLE offers ADD COLUMN IF NOT EXISTS default_vertical_id UUID REFERENCES verticals(id);
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS vertical_id UUID REFERENCES verticals(id);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_offers_vertical ON offers(default_vertical_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_vertical ON campaigns(vertical_id);
