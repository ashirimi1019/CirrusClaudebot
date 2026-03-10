import { listCompanies } from '../lib/db/companies';
import { upsertBuyer, insertBuyer } from '../lib/db/buyers';
import { findDecisionMakers } from '../lib/clients/parallel';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface RunBuyerDiscoveryParams {
  companyLimit?: number;
}

export interface BuyerSummary {
  companies_processed: number;
  buyers_created: number;
}

// ---------------------------------------------------------------------------
// Caps
// ---------------------------------------------------------------------------

const MAX_COMPANIES = 10;
const MAX_BUYERS_PER_COMPANY = 5;

const ICP_TITLES = [
  'CTO',
  'VP Engineering',
  'VP of Engineering',
  'Director of Engineering',
  'CIO',
  'Founder',
  'Co-Founder',
];

// ---------------------------------------------------------------------------
// Main orchestrator
// ---------------------------------------------------------------------------

export async function runBuyerDiscovery(
  params: RunBuyerDiscoveryParams = {}
): Promise<BuyerSummary> {
  const { companyLimit = MAX_COMPANIES } = params;

  // 1. Fetch newest companies — hard cap at MAX_COMPANIES
  const companies = await listCompanies(Math.min(companyLimit, MAX_COMPANIES));

  let companies_processed = 0;
  let buyers_created = 0;

  // 2. For each company, find decision makers
  for (const company of companies) {
    const people = await findDecisionMakers({
      domain: company.domain,
      titles: ICP_TITLES,
      limit: MAX_BUYERS_PER_COMPANY,
    });

    // Take at most MAX_BUYERS_PER_COMPANY
    const batch = people.slice(0, MAX_BUYERS_PER_COMPANY);

    for (const person of batch) {
      const email = person.email
        ? person.email.toLowerCase().trim()
        : null;

      if (email) {
        // Has email — upsert (safe to re-run, deduplicates on email)
        await upsertBuyer({
          company_id: company.id,
          first_name: person.first_name,
          last_name: person.last_name,
          title: person.title,
          email,
          linkedin_url: person.linkedin_url,
          enriched_at: new Date().toISOString(),
        });
      } else {
        // No email — plain insert, no conflict guard needed
        await insertBuyer({
          company_id: company.id,
          first_name: person.first_name,
          last_name: person.last_name,
          title: person.title,
          email: null,
          linkedin_url: person.linkedin_url,
          enriched_at: new Date().toISOString(),
        });
      }

      buyers_created += 1;
    }

    companies_processed += 1;
  }

  return { companies_processed, buyers_created };
}
