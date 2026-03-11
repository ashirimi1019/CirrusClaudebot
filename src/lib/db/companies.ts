import { getSupabaseClient, Company } from '../supabase.ts';
import { withRetry, isTransientError } from '../services/retry.ts';

/** Retry predicate for Supabase: retry on network errors and 5xx/503 */
function isTransientDbError(error: any): boolean {
  // Supabase errors with a status property
  if (error?.status >= 500) return true;
  if (error?.code === 'PGRST301') return true; // connection pool exhausted
  return isTransientError(error);
}

export async function upsertCompany(data: {
  domain: string;
  name?: string | null;
  employee_count?: number | null;
  funding_stage?: string | null;
  industry?: string | null;
  country?: string;
  fit_score?: number;
}): Promise<Company> {
  if (!data.domain || data.domain.trim() === '') {
    throw new Error('upsertCompany: domain is required');
  }

  const sb = getSupabaseClient();

  const { data: result, error } = await withRetry(
    () => sb
      .from('companies')
      .upsert({
        domain: data.domain,
        name: data.name || null,
        employee_count: data.employee_count || null,
        funding_stage: data.funding_stage || null,
        industry: data.industry || null,
        country: data.country || 'US',
        fit_score: data.fit_score ?? 0,
      }, { onConflict: 'domain' })
      .select()
      .single(),
    { label: `db_upsert_company_${data.domain}`, maxAttempts: 2, retryIf: isTransientDbError }
  );

  if (error) {
    throw new Error(`upsertCompany failed for "${data.domain}": ${error.message || JSON.stringify(error)}`);
  }
  if (!result) {
    throw new Error(`upsertCompany returned no data for "${data.domain}"`);
  }
  return result as Company;
}

export async function getCompanyById(id: string): Promise<Company | null> {
  const sb = getSupabaseClient();

  const { data, error } = await sb
    .from('companies')
    .select('*')
    .eq('id', id)
    .single();

  if (error) return null;
  return data as Company;
}

export async function getCompanyByDomain(domain: string): Promise<Company | null> {
  const sb = getSupabaseClient();

  const { data, error } = await sb
    .from('companies')
    .select('*')
    .eq('domain', domain)
    .single();

  if (error) return null;
  return data as Company;
}
