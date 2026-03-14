import { isTransientError } from '../services/retry.ts';

/** Retry predicate for Supabase: retry on network errors and 5xx/503 */
export function isTransientDbError(error: any): boolean {
  // Supabase errors with a status property
  if (error?.status >= 500) return true;
  if (error?.code === 'PGRST301') return true; // connection pool exhausted
  return isTransientError(error);
}
