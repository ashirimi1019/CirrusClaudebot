/**
 * Deduplication Service
 * Handles domain extraction and deduplication of companies/contacts
 */

/**
 * Extract clean domain from a company's website URL.
 * Falls back to guessing from company name.
 */
export function extractDomain(websiteUrl: string | null, companyName: string): string {
  if (websiteUrl) {
    return websiteUrl
      .replace(/^https?:\/\//, '')
      .replace(/\/$/, '')
      .replace(/^www\./, '')
      .split('/')[0]; // strip any path
  }
  // Fallback: guess domain from company name
  return `${companyName.toLowerCase().replace(/[^a-z0-9]/g, '')}.com`;
}

/**
 * Deduplicate an array of items by a key function.
 * Returns only the first occurrence of each key.
 */
export function deduplicateBy<T>(items: T[], keyFn: (item: T) => string): T[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = keyFn(item);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * Deduplicate companies by their id field.
 */
export function deduplicateCompanies<T extends { id: string }>(companies: T[]): T[] {
  return deduplicateBy(companies, (c) => c.id);
}

/**
 * Normalize an email address for deduplication.
 */
export function normalizeEmail(email: string): string {
  return email.toLowerCase().trim();
}

/**
 * Check if an email looks valid (basic check).
 */
export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// ============================================================================
// LinkedIn URL Normalization
// ============================================================================

/**
 * Normalize a LinkedIn URL for comparison.
 * Strips protocol, www, trailing slashes, query params, and locale prefixes.
 * Returns lowercase cleaned URL or empty string.
 *
 * Examples:
 *   "https://www.linkedin.com/in/john-doe/" → "linkedin.com/in/john-doe"
 *   "https://uk.linkedin.com/in/john-doe?trk=abc" → "linkedin.com/in/john-doe"
 */
export function normalizeLinkedInUrl(url: string | null | undefined): string {
  if (!url || url.trim() === '') return '';
  let cleaned = url.toLowerCase().trim();

  // Strip protocol
  cleaned = cleaned.replace(/^https?:\/\//, '');

  // Strip www and country-code subdomains (uk., fr., de., etc.)
  cleaned = cleaned.replace(/^(www\.|[a-z]{2}\.)?(linkedin\.com)/, '$2');

  // Strip query params and hash
  cleaned = cleaned.split('?')[0].split('#')[0];

  // Strip trailing slash
  cleaned = cleaned.replace(/\/+$/, '');

  return cleaned;
}

// ============================================================================
// Name Normalization
// ============================================================================

/**
 * Normalize a name for fuzzy matching.
 * Lowercases, trims, collapses whitespace, removes common suffixes.
 */
export function normalizeName(name: string | null | undefined): string {
  if (!name) return '';
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/\b(jr|sr|ii|iii|iv|phd|md|mba|cpa)\b\.?/gi, '')
    .trim();
}

// ============================================================================
// Multi-Field Cascade Contact Matching
// ============================================================================

/**
 * Contact matching priority cascade.
 * Returns the matching contact ID if found, or null.
 *
 * Priority order:
 *   1. apollo_contact_id (exact)
 *   2. email (normalized, exact)
 *   3. linkedin_url (normalized, exact)
 *   4. first_name + last_name + company_id (normalized)
 *
 * Each level short-circuits — first match wins.
 */
export interface ContactMatchCandidate {
  apollo_contact_id?: string | null;
  email?: string | null;
  linkedin_url?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  company_id: string;
}

export interface ContactMatchResult {
  matched: boolean;
  existing_id: string | null;
  match_method: 'apollo_contact_id' | 'email' | 'linkedin_url' | 'name_company' | 'none';
}

export async function findExistingContact(
  candidate: ContactMatchCandidate,
  supabaseClient: any,
): Promise<ContactMatchResult> {
  const noMatch: ContactMatchResult = { matched: false, existing_id: null, match_method: 'none' };

  // 1. Match by apollo_contact_id
  if (candidate.apollo_contact_id) {
    const { data } = await supabaseClient
      .from('contacts')
      .select('id')
      .eq('apollo_contact_id', candidate.apollo_contact_id)
      .limit(1)
      .maybeSingle();
    if (data?.id) {
      return { matched: true, existing_id: data.id, match_method: 'apollo_contact_id' };
    }
  }

  // 2. Match by email
  if (candidate.email) {
    const normalized = normalizeEmail(candidate.email);
    if (isValidEmail(normalized)) {
      const { data } = await supabaseClient
        .from('contacts')
        .select('id')
        .eq('email', normalized)
        .limit(1)
        .maybeSingle();
      if (data?.id) {
        return { matched: true, existing_id: data.id, match_method: 'email' };
      }
    }
  }

  // 3. Match by LinkedIn URL
  if (candidate.linkedin_url) {
    const normalizedUrl = normalizeLinkedInUrl(candidate.linkedin_url);
    if (normalizedUrl.includes('linkedin.com/in/')) {
      // Query contacts at same company and normalize in-app
      const { data: linkedinMatches } = await supabaseClient
        .from('contacts')
        .select('id, linkedin_url')
        .eq('company_id', candidate.company_id)
        .not('linkedin_url', 'is', null);

      if (linkedinMatches?.length) {
        const match = linkedinMatches.find(
          (c: { linkedin_url: string }) => normalizeLinkedInUrl(c.linkedin_url) === normalizedUrl,
        );
        if (match) {
          return { matched: true, existing_id: match.id, match_method: 'linkedin_url' };
        }
      }
    }
  }

  // 4. Match by first_name + last_name + company_id
  if (candidate.first_name && candidate.last_name && candidate.company_id) {
    const fn = normalizeName(candidate.first_name);
    const ln = normalizeName(candidate.last_name);
    if (fn && ln) {
      const { data: nameMatches } = await supabaseClient
        .from('contacts')
        .select('id, first_name, last_name')
        .eq('company_id', candidate.company_id);

      if (nameMatches?.length) {
        const match = nameMatches.find(
          (c: { first_name: string | null; last_name: string | null }) =>
            normalizeName(c.first_name) === fn && normalizeName(c.last_name) === ln,
        );
        if (match) {
          return { matched: true, existing_id: match.id, match_method: 'name_company' };
        }
      }
    }
  }

  return noMatch;
}

// ============================================================================
// In-Memory Contact Deduplication (for export pipelines)
// ============================================================================

/**
 * Deduplicate contacts array by email (in-memory, for export pipelines).
 * Returns deduplicated array keeping the first occurrence.
 */
export function deduplicateContactsByEmail<T extends { email?: string | null }>(contacts: T[]): T[] {
  const seen = new Set<string>();
  return contacts.filter((c) => {
    if (!c.email) return true; // keep contacts without email (can't dedup them)
    const key = normalizeEmail(c.email);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
