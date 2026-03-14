/**
 * Supabase-backed rate limiter for skill runner API routes.
 *
 * Uses a fixed hourly window (rate_limit_buckets table + increment_rate_limit RPC).
 * Identity: userId first, IP fallback.
 * Threshold: 20 requests per hour.
 * Fails open on DB error — does not block legitimate requests.
 */
import { SupabaseClient } from '@supabase/supabase-js';

export const SKILL_RUN_LIMIT = 20;
const WINDOW_SECONDS = 3600; // 1 hour

export interface RateLimitResult {
  allowed: boolean;
  count: number;
  limit: number;
  resetAt: Date;
}

/**
 * Check and increment the rate limit for a skill run request.
 *
 * @param supabase  - Service-role Supabase client (from adminDb in route.ts)
 * @param userId    - Authenticated user ID (preferred key)
 * @param ip        - Request IP address (fallback key when userId is null)
 */
export async function checkSkillRunRateLimit(
  supabase: SupabaseClient,
  userId: string | null,
  ip: string,
): Promise<RateLimitResult> {
  const key = userId ? `user:${userId}` : `ip:${ip}`;
  const fallbackResult: RateLimitResult = {
    allowed: true,
    count: 0,
    limit: SKILL_RUN_LIMIT,
    resetAt: new Date(Date.now() + WINDOW_SECONDS * 1000),
  };

  try {
    const { data, error } = await supabase.rpc('increment_rate_limit', {
      p_key: key,
      p_route: 'skill-run',
      p_limit: SKILL_RUN_LIMIT,
      p_window_seconds: WINDOW_SECONDS,
    });

    if (error || !data || !Array.isArray(data) || data.length === 0) {
      console.warn('[rate-limit] DB error, failing open:', error?.message ?? 'no data');
      return fallbackResult;
    }

    const row = data[0] as { allowed: boolean; count: number; reset_at: string };
    return {
      allowed: row.allowed,
      count: row.count,
      limit: SKILL_RUN_LIMIT,
      resetAt: new Date(row.reset_at),
    };
  } catch (err) {
    console.warn('[rate-limit] Unexpected error, failing open:', err);
    return fallbackResult;
  }
}
