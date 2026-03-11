/**
 * Retry + Resilience Service
 * Bounded, logged retries for transient external failures.
 * No reckless retries — all are bounded, backoff-based, and logged.
 */

export interface RetryOptions {
  /** Max number of attempts (including the first). Default: 3 */
  maxAttempts?: number;
  /** Base delay in ms before first retry. Default: 1000 */
  baseDelayMs?: number;
  /** Multiply delay by this factor each retry. Default: 2 */
  backoffMultiplier?: number;
  /** Operation label for logging. */
  label: string;
  /** If true, swallow final error and return null instead of throwing. Default: false */
  swallowOnExhaust?: boolean;
  /** Optional: only retry if this predicate returns true for the error. */
  retryIf?: (error: any) => boolean;
}

/** Default retry predicate: retry on network/timeout/5xx errors */
export function isTransientError(error: any): boolean {
  // Axios-style error
  const status = error?.response?.status;
  if (status && status >= 500) return true;              // 5xx server errors
  if (status === 429) return true;                       // rate-limited
  if (error?.code === 'ECONNRESET') return true;         // connection reset
  if (error?.code === 'ECONNABORTED') return true;       // timeout
  if (error?.code === 'ETIMEDOUT') return true;
  if (error?.message?.includes('timeout')) return true;
  if (error?.message?.includes('ENOTFOUND')) return true; // DNS failure
  return false;
}

/**
 * Execute an async function with bounded retry + exponential backoff.
 *
 * Usage:
 *   const result = await withRetry(() => apolloClient.post(...), {
 *     label: 'apollo_company_search',
 *     maxAttempts: 3,
 *   });
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions
): Promise<T> {
  const maxAttempts = options.maxAttempts ?? 3;
  const baseDelay = options.baseDelayMs ?? 1000;
  const multiplier = options.backoffMultiplier ?? 2;
  const shouldRetry = options.retryIf ?? isTransientError;

  let lastError: any;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;

      // Don't retry non-transient errors (e.g., 400, 401, 422)
      if (!shouldRetry(error)) {
        throw error;
      }

      if (attempt < maxAttempts) {
        const delay = baseDelay * Math.pow(multiplier, attempt - 1);
        const status = error?.response?.status || 'N/A';
        console.warn(
          `  ⟳ [${options.label}] Attempt ${attempt}/${maxAttempts} failed (status: ${status}). ` +
          `Retrying in ${delay}ms...`
        );
        await sleep(delay);
      }
    }
  }

  // All attempts exhausted
  if (options.swallowOnExhaust) {
    console.warn(
      `  ⚠️ [${options.label}] All ${maxAttempts} attempts failed. Returning null.`
    );
    return null as T;
  }

  throw lastError;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
