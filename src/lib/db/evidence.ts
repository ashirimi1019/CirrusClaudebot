import { getSupabaseClient, Evidence, EvidenceType } from '../supabase.ts';
import { withRetry, isTransientError } from '../services/retry.ts';

function isTransientDbError(error: any): boolean {
  if (error?.status >= 500) return true;
  if (error?.code === 'PGRST301') return true;
  return isTransientError(error);
}

export async function insertEvidence(data: {
  company_id: string;
  type: EvidenceType;
  title?: string | null;
  raw_json?: Record<string, unknown> | null;
  source?: string | null;
  posted_at?: string | null;
}): Promise<Evidence> {
  if (!data.company_id) {
    throw new Error('insertEvidence: company_id is required');
  }

  const sb = getSupabaseClient();

  const { data: result, error } = await withRetry(
    () => sb
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
      .single(),
    { label: `db_insert_evidence_${data.type}`, maxAttempts: 2, retryIf: isTransientDbError }
  );

  if (error) {
    throw new Error(`insertEvidence failed for company "${data.company_id}": ${error.message || JSON.stringify(error)}`);
  }
  if (!result) {
    throw new Error(`insertEvidence returned no data for company "${data.company_id}"`);
  }
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

  if (error) throw new Error(`getEvidenceByCompanyId failed: ${error.message}`);
  return data as Evidence[];
}
