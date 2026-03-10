import { getSupabaseClient, Buyer } from '../lib/supabase';
import { getCompanyById } from '../lib/db/companies';
import { listEvidenceByCompany } from '../lib/db/evidence';
import { insertDraft } from '../lib/db/drafts';
import { generateDraft } from '../lib/clients/openai';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface RunDraftGenerationParams {
  buyerLimit?: number;
}

export interface DraftSummary {
  buyers_processed: number;
  drafts_created: number;
}

// ---------------------------------------------------------------------------
// Cap
// ---------------------------------------------------------------------------

const MAX_BUYERS = 20;

// ---------------------------------------------------------------------------
// Fetch buyers that have no draft yet
// Left-join via PostgREST embed: buyers -> drafts(id)
// Rows with drafts.length === 0 have never had a draft generated
// ---------------------------------------------------------------------------

async function fetchBuyersWithoutDrafts(limit: number): Promise<Buyer[]> {
  const sb = getSupabaseClient();

  const { data, error } = await sb
    .from('buyers')
    .select(
      'id, company_id, first_name, last_name, title, email, linkedin_url, enriched_at, created_at, drafts(id)'
    )
    .order('created_at', { ascending: false })
    .limit(limit * 4); // over-fetch to account for buyers that already have drafts

  if (error) throw new Error(`fetchBuyersWithoutDrafts: ${error.message}`);

  const rows = (data ?? []) as Array<Buyer & { drafts: { id: string }[] }>;

  return rows
    .filter((r) => !r.drafts || r.drafts.length === 0)
    .slice(0, limit)
    .map(({ drafts: _drafts, ...buyer }) => buyer as Buyer);
}

// ---------------------------------------------------------------------------
// Main orchestrator
// ---------------------------------------------------------------------------

export async function runDraftGeneration(
  params: RunDraftGenerationParams = {}
): Promise<DraftSummary> {
  const { buyerLimit = MAX_BUYERS } = params;

  const buyers = await fetchBuyersWithoutDrafts(
    Math.min(buyerLimit, MAX_BUYERS)
  );

  let buyers_processed = 0;
  let drafts_created = 0;

  for (const buyer of buyers) {
    // 1. Fetch company
    const company = await getCompanyById(buyer.company_id);
    if (!company) continue;

    // 2. Fetch newest evidence for this company (limit 1 = most recent)
    const evidenceList = await listEvidenceByCompany(buyer.company_id, 1);
    if (evidenceList.length === 0) continue; // no evidence — skip as specified

    const evidence = evidenceList[0];

    // 3. One OpenAI call per buyer — no multi-variant, no regeneration
    const draft = await generateDraft({
      companyName: company.name ?? company.domain,
      buyerFirstName: buyer.first_name ?? undefined,
      buyerTitle: buyer.title ?? undefined,
      evidenceTitle: evidence.title ?? undefined,
      jobUrl: (evidence.raw_json as Record<string, unknown>)?.job_url as
        | string
        | undefined,
    });

    // 4. Insert draft as pending, linked to buyer + evidence
    await insertDraft({
      buyer_id: buyer.id,
      evidence_id: evidence.id,
      subject: draft.subject,
      body: draft.body,
      status: 'pending',
    });

    buyers_processed += 1;
    drafts_created += 1;
  }

  return { buyers_processed, drafts_created };
}
