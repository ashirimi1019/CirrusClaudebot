import { getSupabaseClient, Contact } from '../supabase.ts';

export async function upsertContact(data: {
  company_id: string;
  first_name?: string | null;
  last_name?: string | null;
  title?: string | null;
  seniority?: string | null;
  department?: string | null;
  email?: string | null;
  email_status?: string | null;
  phone?: string | null;
  linkedin_url?: string | null;
  apollo_contact_id?: string | null;
  fit_score?: number | null;
  enriched_at?: string | null;
}): Promise<Contact> {
  const sb = getSupabaseClient();

  const { data: result, error } = await sb
    .from('contacts')
    .upsert({
      company_id: data.company_id,
      first_name: data.first_name || null,
      last_name: data.last_name || null,
      title: data.title || null,
      seniority: data.seniority || null,
      department: data.department || null,
      email: data.email || null,
      email_status: data.email_status || null,
      phone: data.phone || null,
      linkedin_url: data.linkedin_url || null,
      apollo_contact_id: data.apollo_contact_id || null,
      fit_score: data.fit_score ?? null,
      enriched_at: data.enriched_at || null,
    }, { onConflict: 'email' })
    .select()
    .single();

  if (error) throw error;
  return result as Contact;
}

export async function getContactsByCompanyId(companyId: string): Promise<Contact[]> {
  const sb = getSupabaseClient();

  const { data, error } = await sb
    .from('contacts')
    .select('*')
    .eq('company_id', companyId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data as Contact[];
}

export async function getContactByEmail(email: string): Promise<Contact | null> {
  const sb = getSupabaseClient();

  const { data, error } = await sb
    .from('contacts')
    .select('*')
    .eq('email', email)
    .single();

  if (error) return null;
  return data as Contact;
}
