/**
 * ICP Scoring Service
 * Evaluates companies against the Ideal Customer Profile (icp-framework.md)
 *
 * Scoring breakdown (max ~230 pts):
 *   Hiring signal (detected by search): 100
 *   Company size (50-5000):            30-50
 *   Funding stage (funded):             30
 *   Revenue ($10M+):                    20
 *   Tech keywords match:                20
 *   Has domain (data quality):          10
 *
 * Qualification threshold: 170 pts
 */

import type { ApolloCompany } from '../clients/apollo.ts';
import type { IcpScore } from '../../types/company.ts';

const ICP_THRESHOLD = 170;

/**
 * Generic tech keywords — used when no vertical is specified.
 * Matches companies that use any cloud/data/SaaS technology.
 */
const GENERIC_TECH_KEYWORDS = [
  'aws', 'cloud', 'data', 'machine learning', 'saas', 'api',
  'platform', 'kubernetes', 'microservices',
];

/**
 * Vertical-specific tech keywords.
 * Chosen to match each vertical's ICP companies more precisely.
 * - staffing: broad engineering stack (same as generic, staffing serves all)
 * - ai-data-consulting: data infrastructure, ML tooling, modern data stack
 * - cloud-software-delivery: cloud-native infra, containers, delivery tooling
 */
const VERTICAL_TECH_KEYWORDS: Record<string, string[]> = {
  'staffing': [
    'aws', 'cloud', 'data', 'machine learning', 'saas', 'api',
    'platform', 'kubernetes', 'microservices',
  ],
  'ai-data-consulting': [
    'machine learning', 'ai', 'data platform', 'data engineering', 'mlops',
    'databricks', 'snowflake', 'spark', 'dbt', 'airflow', 'llm', 'generative ai',
    'data lake', 'data warehouse', 'vector database', 'openai', 'hugging face',
  ],
  'cloud-software-delivery': [
    'kubernetes', 'docker', 'terraform', 'aws', 'gcp', 'azure', 'cloud native',
    'devops', 'platform engineering', 'sre', 'microservices', 'ci/cd',
    'infrastructure as code', 'helm', 'istio', 'observability',
  ],
};

/**
 * Returns the keyword list for a given vertical slug.
 * Falls back to generic if the vertical is unknown.
 */
export function getVerticalTechKeywords(verticalSlug?: string): string[] {
  if (!verticalSlug) return GENERIC_TECH_KEYWORDS;
  return VERTICAL_TECH_KEYWORDS[verticalSlug] ?? GENERIC_TECH_KEYWORDS;
}

export function scoreCompany(company: ApolloCompany, verticalSlug?: string): IcpScore {
  let total = 0;
  const missingPoints: string[] = [];

  // Active hiring signal (already detected by search) = 100 pts
  const hiring_signal = 100;
  total += hiring_signal;

  // Company size (ICP: 50-5000)
  const size = company.employee_count || company.estimated_num_employees || 0;
  let company_size = 0;
  if (size >= 50 && size <= 1000) company_size = 50;
  else if (size > 1000 && size <= 5000) company_size = 30;
  else if (size === 0) {
    // Size unknown but company passed the employee range filter in the API call
    company_size = 40;
  } else {
    missingPoints.push('company_size');
  }
  total += company_size;

  // Funding stage
  let funding = 0;
  if (company.funding_stage && company.funding_stage !== 'unfunded') {
    funding = 30;
  } else {
    missingPoints.push('funding');
  }
  total += funding;

  // Revenue ($10M+)
  let revenue_score = 0;
  const revenue = (company as any).revenue || company.revenue || 0;
  if (revenue > 10_000_000) {
    revenue_score = 20;
  } else {
    missingPoints.push('revenue');
  }
  total += revenue_score;

  // Tech keywords match — vertical-aware
  const keywords = getVerticalTechKeywords(verticalSlug);
  const companyKeywords = (company.keywords || []).join(' ').toLowerCase();
  let tech_keywords = 0;
  if (keywords.some((k) => companyKeywords.includes(k))) {
    tech_keywords = 20;
  } else {
    missingPoints.push('tech_keywords');
  }
  total += tech_keywords;

  // Has a domain (basic data quality check)
  let domain_score = 0;
  if (company.website_url || (company as any).primary_domain) {
    domain_score = 10;
  }
  total += domain_score;

  const qualifies = total >= ICP_THRESHOLD;

  const rejection_reason = qualifies
    ? undefined
    : `score ${total} < threshold ${ICP_THRESHOLD}${missingPoints.length > 0 ? ` (missing points: ${missingPoints.join(', ')})` : ''}`;

  return {
    company_id: company.id,
    total,
    hiring_signal,
    company_size,
    funding,
    revenue_score,
    tech_keywords,
    qualifies,
    rejection_reason,
  };
}

export function filterQualifyingCompanies(
  companies: ApolloCompany[],
  threshold: number = ICP_THRESHOLD,
  verticalSlug?: string,
): ApolloCompany[] {
  return companies.filter((c) => {
    const score = scoreCompany(c, verticalSlug);
    return score.total >= threshold;
  });
}

export { ICP_THRESHOLD };
