import { searchHiringSignals } from '../lib/clients/theirstack';
import { upsertCompany } from '../lib/db/companies';
import { insertEvidence } from '../lib/db/evidence';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface RunResearchCampaignParams {
  roles: string[];
  country?: string;
  limit?: number;
}

export interface ResearchSummary {
  total_results: number;
  companies_upserted: number;
  evidence_created: number;
}

// ---------------------------------------------------------------------------
// Hard cap — never process more than 25 results per run
// ---------------------------------------------------------------------------

const MAX_RESULTS = 25;

// ---------------------------------------------------------------------------
// Main orchestrator
// ---------------------------------------------------------------------------

export async function runResearchCampaign(
  params: RunResearchCampaignParams
): Promise<ResearchSummary> {
  const { roles, country = 'US', limit = MAX_RESULTS } = params;

  // 1. Fetch hiring signals from TheirStack
  const signals = await searchHiringSignals({
    roles,
    country,
    limit: Math.min(limit, MAX_RESULTS),
  });

  const total_results = signals.length;
  let companies_upserted = 0;
  let evidence_created = 0;

  // 2. Process each result — hard cap at MAX_RESULTS
  const batch = signals.slice(0, MAX_RESULTS);

  for (const signal of batch) {
    // Skip records with no domain — can't deduplicate without one
    if (!signal.company_domain) continue;

    // 2a. Upsert company
    const company = await upsertCompany({
      domain: signal.company_domain,
      name: signal.company_name,
      size_min: null,
      size_max: null,
      funding_stage: null,
      country,
    });

    companies_upserted += 1;

    // 2b. Insert evidence row linked to this company
    await insertEvidence({
      company_id: company.id,
      type: 'job_post',
      title: signal.job_title,
      raw_json: signal.raw_json,
      source: 'theirstack',
      posted_at: signal.posted_at,
    });

    evidence_created += 1;
  }

  return { total_results, companies_upserted, evidence_created };
}
