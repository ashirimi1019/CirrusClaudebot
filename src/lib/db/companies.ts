import { getSupabaseClient, Company } from '../supabase.ts';

export async function upsertCompany(data: {
  domain: string;
  name?: string | null;
  size_min?: number | null;
  size_max?: number | null;
  funding_stage?: string | null;
  country?: string;
}): Promise<Company> {
  const sb = getSupabaseClient();

  const { data: result, error } = await sb
    .from('companies')
    .upsert({
      domain: data.domain,
      name: data.name || null,
      size_min: data.size_min || null,
      size_max: data.size_max || null,
      funding_stage: data.funding_stage || null,
      country: data.country || 'US',
    })
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
