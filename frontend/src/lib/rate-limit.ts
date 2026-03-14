/**
 * Rate limiter for skill runner API routes.
 *
 * Requires UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN env vars.
 * When absent (local dev), returns null — no limiting applied.
 */
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const { UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN } = process.env;

export const skillRunLimiter: Ratelimit | null =
  UPSTASH_REDIS_REST_URL && UPSTASH_REDIS_REST_TOKEN
    ? new Ratelimit({
        redis: new Redis({
          url: UPSTASH_REDIS_REST_URL,
          token: UPSTASH_REDIS_REST_TOKEN,
        }),
        limiter: Ratelimit.slidingWindow(10, '1 h'),
        analytics: false,
        prefix: 'cirrus:skill-run',
      })
    : null;
