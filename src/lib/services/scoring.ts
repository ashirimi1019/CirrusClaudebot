/**
 * ICP Scoring Service
 * Evaluates companies against the Ideal Customer Profile (icp-framework.md)
 */

import type { ApolloCompany } from '../clients/apollo.ts';
import type { IcpScore } from '../../types/company.ts';

const ICP_THRESHOLD = 170;

const TECH_KEYWORDS = ['aws', 'cloud', 'data', 'machine learning', 'saas', 'api', 'platform', 'kubernetes', 'microservices'];

export function scoreCompany(company: ApolloCompany): IcpScore {
  let total = 0;

  // Active hiring signal (already detected by search) = 100 pts
  const hiring_signal = 100;
  total += hiring_signal;

  // Company size (ICP: 50-5000)
  const size = company.employee_count || company.estimated_num_employees || 0;
  let company_size = 0;
  if (size >= 50 && size <= 1000) company_size = 50;
  else if (size > 1000 && size <= 5000) company_size = 30;
  total += company_size;

  // Funding stage
  let funding = 0;
  if (company.funding_stage && company.funding_stage !== 'unfunded') funding = 30;
  total += funding;

  // Tech keywords match
  const companyKeywords = (company.keywords || []).join(' ').toLowerCase();
  let tech_keywords = 0;
  if (TECH_KEYWORDS.some((k) => companyKeywords.includes(k))) tech_keywords = 20;
  total += tech_keywords;

  return {
    company_id: company.id,
    total,
    hiring_signal,
    company_size,
    funding,
    tech_keywords,
    qualifies: total >= ICP_THRESHOLD,
  };
}

export function filterQualifyingCompanies(
  companies: ApolloCompany[],
  threshold: number = ICP_THRESHOLD
): ApolloCompany[] {
  return companies.filter((c) => {
    const score = scoreCompany(c);
    return score.total >= threshold;
  });
}

export { ICP_THRESHOLD };
