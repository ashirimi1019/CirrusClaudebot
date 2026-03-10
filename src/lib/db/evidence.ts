import { getSupabaseClient, Evidence, EvidenceType } from '../supabase.ts';

export async function insertEvidence(data: {
  company_id: string;
  type: EvidenceType;
  title?: string | null;
  raw_json?: Record<string, unknown> | null;
  source?: string | null;
  posted_at?: string | null;
}): Promise<Evidence> {
  const sb = getSupabaseClient();

  const { data: result, error } = await sb
    .from('evidence')
    .insert({
      company_id: data.company_id,
      type: data.type,
      title: data.title || null,
      raw_json: data.raw_json || null,
      source: data.source || null,
      posted_at: data.posted_at || null,
    })
    .select()
    .single();

  if (error) throw error;
  return result as Evidence;
}

export async function getEvidenceByCompanyId(
  companyId: string
): Promise<Evidence[]> {
  const sb = getSupabaseClient();

  const { data, error } = await sb
    .from('evidence')
    .select('*')
    .eq('company_id', companyId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data as Evidence[];
}
