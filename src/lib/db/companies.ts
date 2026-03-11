import { getSupabaseClient, Company } from '../supabase.ts';

export async function upsertCompany(data: {
  domain: string;
  name?: string | null;
  employee_count?: number | null;
  funding_stage?: string | null;
  industry?: string | null;
  country?: string;
  fit_score?: number;
}): Promise<Company> {
  const sb = getSupabaseClient();

  const { data: result, error } = await sb
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
    .single();

  if (error) throw error;
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
