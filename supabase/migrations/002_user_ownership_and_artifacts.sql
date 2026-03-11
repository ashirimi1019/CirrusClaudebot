-- 002_user_ownership_and_artifacts.sql
-- Adds user ownership to core tables, formalizes skill_runs, creates artifacts table.

-- ─── 1. Formalize skill_runs ─────────────────────────────────────────────────
-- This table may already exist (created ad-hoc in production).
-- CREATE TABLE IF NOT EXISTS ensures idempotency.

CREATE TABLE IF NOT EXISTS skill_runs (
  id            uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  skill_number  int         NOT NULL,
  status        text        NOT NULL DEFAULT 'running',
  exit_code     int,
  log_lines     text[],
  offer_id      uuid        REFERENCES offers(id) ON DELETE SET NULL,
  campaign_id   uuid        REFERENCES campaigns(id) ON DELETE SET NULL,
  user_id       uuid,
  started_at    timestamptz DEFAULT now(),
  finished_at   timestamptz,
  duration_ms   int,
  created_at    timestamptz DEFAULT now()
);

-- If skill_runs already exists but lacks user_id, add it:
ALTER TABLE skill_runs ADD COLUMN IF NOT EXISTS user_id uuid;

-- ─── 2. Add user_id to core tables ──────────────────────────────────────────

ALTER TABLE offers     ADD COLUMN IF NOT EXISTS user_id uuid;
ALTER TABLE campaigns  ADD COLUMN IF NOT EXISTS user_id uuid;

-- ─── 3. Artifacts table ─────────────────────────────────────────────────────
-- Tracks every generated file produced by skill runs.

CREATE TABLE IF NOT EXISTS artifacts (
  id              uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  skill_run_id    uuid        REFERENCES skill_runs(id) ON DELETE SET NULL,
  skill_number    int         NOT NULL,
  offer_id        uuid        REFERENCES offers(id) ON DELETE SET NULL,
  campaign_id     uuid        REFERENCES campaigns(id) ON DELETE SET NULL,
  user_id         uuid,
  file_path       text        NOT NULL,   -- relative, e.g. "offers/talent-as-service-us/positioning.md"
  file_type       text        NOT NULL,   -- "md", "csv", "json"
  file_name       text        NOT NULL,   -- "positioning.md"
  category        text        NOT NULL,   -- "positioning", "strategy", "copy", "leads", "outreach", "results"
  file_size_bytes int,
  created_at      timestamptz DEFAULT now()
);

-- ─── 4. Indexes ──────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_skill_runs_user       ON skill_runs(user_id);
CREATE INDEX IF NOT EXISTS idx_skill_runs_campaign    ON skill_runs(campaign_id);
CREATE INDEX IF NOT EXISTS idx_skill_runs_started     ON skill_runs(started_at DESC);

CREATE INDEX IF NOT EXISTS idx_artifacts_user         ON artifacts(user_id);
CREATE INDEX IF NOT EXISTS idx_artifacts_campaign     ON artifacts(campaign_id);
CREATE INDEX IF NOT EXISTS idx_artifacts_skill_run    ON artifacts(skill_run_id);
CREATE INDEX IF NOT EXISTS idx_artifacts_created      ON artifacts(created_at DESC);
