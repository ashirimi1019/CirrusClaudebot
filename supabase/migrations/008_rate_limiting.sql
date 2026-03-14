-- Migration 008: Rate limiting table and atomic increment function
-- Used by /api/skills/run to enforce 20 requests/hour per user (or IP fallback).

CREATE TABLE IF NOT EXISTS rate_limit_buckets (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  key         TEXT        NOT NULL,               -- "user:<userId>" or "ip:<ip>"
  route       TEXT        NOT NULL,               -- e.g. "skill-run"
  window_start TIMESTAMPTZ NOT NULL,              -- truncated to hour (fixed window)
  count       INTEGER     NOT NULL DEFAULT 1,
  last_request_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (key, route, window_start)
);

-- Index for cleanup queries
CREATE INDEX IF NOT EXISTS idx_rate_limit_buckets_window
  ON rate_limit_buckets (window_start);

-- Atomic increment-and-check function.
-- Inserts a new bucket row or increments the existing one for the current hour.
-- Returns: allowed (true if count <= limit), count (new count), reset_at (end of current window).
CREATE OR REPLACE FUNCTION increment_rate_limit(
  p_key            TEXT,
  p_route          TEXT,
  p_limit          INTEGER,
  p_window_seconds INTEGER DEFAULT 3600
) RETURNS TABLE(allowed BOOLEAN, count INTEGER, reset_at TIMESTAMPTZ)
LANGUAGE plpgsql AS $$
DECLARE
  v_window_start TIMESTAMPTZ;
  v_count        INTEGER;
  v_reset_at     TIMESTAMPTZ;
BEGIN
  v_window_start := date_trunc('hour', NOW());
  v_reset_at     := v_window_start + make_interval(secs => p_window_seconds);

  INSERT INTO rate_limit_buckets (key, route, window_start, count, last_request_at)
  VALUES (p_key, p_route, v_window_start, 1, NOW())
  ON CONFLICT (key, route, window_start)
  DO UPDATE SET
    count           = rate_limit_buckets.count + 1,
    last_request_at = NOW()
  RETURNING rate_limit_buckets.count INTO v_count;

  RETURN QUERY SELECT (v_count <= p_limit) AS allowed, v_count, v_reset_at;
END;
$$;
